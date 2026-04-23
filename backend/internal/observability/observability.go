package observability

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"os"
	"strings"
	"unicode"
)

type contextKey string

const (
	requestIDContextKey contextKey = "request_id"
	loggerContextKey    contextKey = "logger"
)

func NewLogger(level string, appEnv string) *slog.Logger {
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: parseLevel(level),
	})).With(
		slog.String("service", "opsdesk-backend"),
		slog.String("environment", strings.TrimSpace(appEnv)),
	)
}

func WithRequest(ctx context.Context, baseLogger *slog.Logger, requestID string) context.Context {
	requestID = NormalizeRequestID(requestID)

	logger := baseLogger
	if logger == nil {
		logger = slog.Default()
	}

	logger = logger.With(slog.String("requestId", requestID))
	ctx = context.WithValue(ctx, requestIDContextKey, requestID)
	ctx = context.WithValue(ctx, loggerContextKey, logger)
	return ctx
}

func RequestIDFromContext(ctx context.Context) string {
	requestID, _ := ctx.Value(requestIDContextKey).(string)
	return requestID
}

func LoggerFromContext(ctx context.Context) *slog.Logger {
	logger, ok := ctx.Value(loggerContextKey).(*slog.Logger)
	if !ok || logger == nil {
		return slog.Default()
	}

	return logger
}

func GenerateRequestID() string {
	buffer := make([]byte, 8)
	if _, err := rand.Read(buffer); err != nil {
		return "req-fallback"
	}

	return "req-" + hex.EncodeToString(buffer)
}

func NormalizeRequestID(value string) string {
	const maxLength = 96

	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return GenerateRequestID()
	}

	var builder strings.Builder
	for _, char := range trimmed {
		if unicode.IsLetter(char) || unicode.IsNumber(char) || char == '-' || char == '_' || char == '.' || char == ':' {
			builder.WriteRune(char)
		}

		if builder.Len() >= maxLength {
			break
		}
	}

	normalized := strings.TrimSpace(builder.String())
	if normalized == "" {
		return GenerateRequestID()
	}

	return normalized
}

func parseLevel(level string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(level)) {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
