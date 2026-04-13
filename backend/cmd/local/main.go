package main

import (
	"log"
	"net/http"
	"time"

	"opsdesk/backend/internal/app"
	"opsdesk/backend/internal/config"
)

func main() {
	cfg := config.Load()

	application, err := app.New(cfg)
	if err != nil {
		log.Fatalf("build application: %v", err)
	}

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           application.Router(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       30 * time.Second,
	}

	log.Printf("opsdesk backend local server listening on http://localhost:%s%s/health", cfg.Port, cfg.APIBasePath)

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("start server: %v", err)
	}
}
