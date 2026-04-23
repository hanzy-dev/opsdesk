package httpapi

import (
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"opsdesk/backend/internal/config"
	"opsdesk/backend/internal/observability"
)

const requestIDHeader = "X-Request-Id"
const correlationIDHeader = "X-Correlation-Id"

func withCORS(cfg config.Config, next http.Handler) http.Handler {
	allowedOrigin := strings.TrimSpace(cfg.FrontendOrigin)

	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		origin := strings.TrimSpace(req.Header.Get("Origin"))
		if origin != "" && allowedOrigin != "" && origin == allowedOrigin {
			headers := w.Header()
			headers.Set("Access-Control-Allow-Origin", origin)
			headers.Set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
			headers.Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-Id, X-Correlation-Id")
			headers.Set("Access-Control-Expose-Headers", "X-Request-Id, X-Correlation-Id")
			headers.Set("Access-Control-Max-Age", "300")
			headers.Add("Vary", "Origin")
			headers.Add("Vary", "Access-Control-Request-Method")
			headers.Add("Vary", "Access-Control-Request-Headers")
		}

		if req.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, req)
	})
}

func withObservability(baseLogger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		requestID := strings.TrimSpace(req.Header.Get(requestIDHeader))
		if requestID == "" {
			requestID = strings.TrimSpace(req.Header.Get(correlationIDHeader))
		}
		ctx := observability.WithRequest(req.Context(), baseLogger, requestID)
		req = req.WithContext(ctx)

		requestID = observability.RequestIDFromContext(ctx)
		w.Header().Set(requestIDHeader, requestID)
		w.Header().Set(correlationIDHeader, requestID)

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
				slog.String("requestId", requestID),
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
