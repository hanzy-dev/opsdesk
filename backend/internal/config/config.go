package config

import "os"

const (
	defaultPort        = "8080"
	defaultAPIBasePath = "/v1"
	defaultAppEnv      = "development"
	defaultLogLevel    = "info"
)

type Config struct {
	AppEnv          string
	Port            string
	APIBasePath     string
	LogLevel        string
	TicketTableName string
}

func Load() Config {
	return Config{
		AppEnv:          getEnv("APP_ENV", defaultAppEnv),
		Port:            getEnv("PORT", defaultPort),
		APIBasePath:     getEnv("API_BASE_PATH", defaultAPIBasePath),
		LogLevel:        getEnv("LOG_LEVEL", defaultLogLevel),
		TicketTableName: getEnv("TICKET_TABLE_NAME", ""),
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}
