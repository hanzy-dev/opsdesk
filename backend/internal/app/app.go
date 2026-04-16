package app

import (
	"context"
	"errors"
	"net/http"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"opsdesk/backend/internal/auth"
	"opsdesk/backend/internal/config"
	httpapi "opsdesk/backend/internal/http"
	"opsdesk/backend/internal/observability"
	dynamorepo "opsdesk/backend/internal/repository/dynamodb"
	"opsdesk/backend/internal/service"
	"opsdesk/backend/internal/storage"
	"opsdesk/backend/internal/validation"
)

type App struct {
	router http.Handler
}

func New(cfg config.Config) (*App, error) {
	if cfg.TicketTableName == "" {
		return nil, errors.New("TICKET_TABLE_NAME is required")
	}

	if cfg.AttachmentBucketName == "" {
		return nil, errors.New("ATTACHMENT_BUCKET_NAME is required")
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(context.Background())
	if err != nil {
		return nil, err
	}

	validator := validation.New()
	ticketRepository := dynamorepo.NewTicketRepository(dynamodb.NewFromConfig(awsCfg), cfg.TicketTableName)
	attachmentStorage := storage.NewS3AttachmentStorage(s3.NewFromConfig(awsCfg), cfg.AttachmentBucketName)
	ticketService := service.NewTicketService(ticketRepository, attachmentStorage)
	authVerifier, err := auth.NewCognitoVerifier(cfg.CognitoRegion, cfg.CognitoUserPoolID, cfg.CognitoAppClientID)
	if err != nil {
		return nil, err
	}

	logger := observability.NewLogger(cfg.LogLevel, cfg.AppEnv)
	router := httpapi.NewRouter(cfg, validator, ticketService, authVerifier, logger)

	return &App{router: router}, nil
}

func (a *App) Router() http.Handler {
	return a.router
}
