package app

import (
	"context"
	"errors"
	"net/http"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"

	"opsdesk/backend/internal/config"
	httpapi "opsdesk/backend/internal/http"
	dynamorepo "opsdesk/backend/internal/repository/dynamodb"
	"opsdesk/backend/internal/service"
	"opsdesk/backend/internal/validation"
)

type App struct {
	router http.Handler
}

func New(cfg config.Config) (*App, error) {
	if cfg.TicketTableName == "" {
		return nil, errors.New("TICKET_TABLE_NAME is required")
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(context.Background())
	if err != nil {
		return nil, err
	}

	validator := validation.New()
	ticketRepository := dynamorepo.NewTicketRepository(dynamodb.NewFromConfig(awsCfg), cfg.TicketTableName)
	ticketService := service.NewTicketService(ticketRepository)

	router := httpapi.NewRouter(cfg, validator, ticketService)

	return &App{router: router}, nil
}

func (a *App) Router() http.Handler {
	return a.router
}
