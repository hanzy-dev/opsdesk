package main

import (
	"log"

	"github.com/aws/aws-lambda-go/lambda"

	"opsdesk/backend/internal/app"
	"opsdesk/backend/internal/config"
	"opsdesk/backend/internal/lambdahttp"
)

func main() {
	handler, err := buildHandler()
	if err != nil {
		log.Fatalf("build lambda handler: %v", err)
	}

	lambda.Start(handler.Proxy)
}

func buildHandler() (*lambdahttp.Adapter, error) {
	cfg := config.Load()

	application, err := app.New(cfg)
	if err != nil {
		return nil, err
	}

	return lambdahttp.New(application.Router()), nil
}
