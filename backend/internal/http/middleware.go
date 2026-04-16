package httpapi

import (
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"opsdesk/backend/internal/observability"
)

const requestIDHeader = "X-Request-Id"

func withObservability(baseLogger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		requestID := strings.TrimSpace(req.Header.Get(requestIDHeader))
		ctx := observability.WithRequest(req.Context(), baseLogger, requestID)
		req = req.WithContext(ctx)

		requestID = observability.RequestIDFromContext(ctx)
		w.Header().Set(requestIDHeader, requestID)

		logger := observability.LoggerFromContext(ctx)
		recorder := &statusRecorder{ResponseWriter: w, statusCode: http.StatusOK}
		startedAt := time.Now()

		logger.Info("incoming request",
			slog.String("event", "request.start"),
			slog.String("method", req.Method),
			slog.String("path", req.URL.Path),
			slog.String("query", req.URL.RawQuery),
			slog.String("remoteAddr", req.RemoteAddr),
			slog.String("userAgent", req.UserAgent()),
		)

		defer func() {
			if recovered := recover(); recovered != nil {
				logger.Error("request panic",
					slog.String("event", "request.panic"),
					slog.String("method", req.Method),
					slog.String("path", req.URL.Path),
					slog.String("panic", fmt.Sprint(recovered)),
				)
				writeInternalError(recorder, req, "internal server error")
			}

			logger.Info("response sent",
				slog.String("event", "request.complete"),
				slog.String("method", req.Method),
				slog.String("path", req.URL.Path),
				slog.Int("status", recorder.statusCode),
				slog.Int64("latencyMs", time.Since(startedAt).Milliseconds()),
				slog.Int("bytes", recorder.bytesWritten),
			)
		}()

		next.ServeHTTP(recorder, req)
	})
}

type statusRecorder struct {
	http.ResponseWriter
	statusCode   int
	bytesWritten int
}

func (r *statusRecorder) WriteHeader(statusCode int) {
	r.statusCode = statusCode
	r.ResponseWriter.WriteHeader(statusCode)
}

func (r *statusRecorder) Write(payload []byte) (int, error) {
	written, err := r.ResponseWriter.Write(payload)
	r.bytesWritten += written
	return written, err
}
