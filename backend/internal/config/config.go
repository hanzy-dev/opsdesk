package config

import "os"

const (
	defaultPort        = "8080"
	defaultAPIBasePath = "/v1"
	defaultAppEnv      = "dev"
	defaultLogLevel    = "info"
)

type Config struct {
	AppEnv               string
	Port                 string
	APIBasePath          string
	LogLevel             string
	TicketTableName      string
	ProfileTableName     string
	AttachmentBucketName string
	CognitoRegion        string
	CognitoUserPoolID    string
	CognitoAppClientID   string
}

func Load() Config {
	return Config{
		AppEnv:               getEnv("APP_ENV", defaultAppEnv),
		Port:                 getEnv("PORT", defaultPort),
		APIBasePath:          getEnv("API_BASE_PATH", defaultAPIBasePath),
		LogLevel:             getEnv("LOG_LEVEL", defaultLogLevel),
		TicketTableName:      getEnv("TICKET_TABLE_NAME", ""),
		ProfileTableName:     getEnv("PROFILE_TABLE_NAME", ""),
		AttachmentBucketName: getEnv("ATTACHMENT_BUCKET_NAME", ""),
		CognitoRegion:        getEnv("COGNITO_REGION", ""),
		CognitoUserPoolID:    getEnv("COGNITO_USER_POOL_ID", ""),
		CognitoAppClientID:   getEnv("COGNITO_APP_CLIENT_ID", ""),
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}
