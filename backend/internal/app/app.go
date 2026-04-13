package app

import (
	"net/http"

	"opsdesk/backend/internal/config"
	httpapi "opsdesk/backend/internal/http"
	"opsdesk/backend/internal/service"
	"opsdesk/backend/internal/validation"
)

type App struct {
	router http.Handler
}

func New(cfg config.Config) (*App, error) {
	validator := validation.New()
	ticketService := service.NewStubTicketService()

	router := httpapi.NewRouter(cfg, validator, ticketService)

	return &App{router: router}, nil
}

func (a *App) Router() http.Handler {
	return a.router
}
