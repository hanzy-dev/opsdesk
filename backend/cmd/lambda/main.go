package main

import (
	"log"

	"opsdesk/backend/internal/app"
	"opsdesk/backend/internal/config"
)

func main() {
	cfg := config.Load()

	_, err := app.New(cfg)
	if err != nil {
		log.Fatalf("build application: %v", err)
	}

	log.Println("opsdesk backend lambda placeholder initialized")
	log.Println("lambda event adapter wiring will be added in a later batch")
}
