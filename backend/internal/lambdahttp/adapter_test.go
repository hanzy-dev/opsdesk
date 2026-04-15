package lambdahttp

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/aws/aws-lambda-go/events"
)

func TestProxyRoutesHTTPEventThroughHandler(t *testing.T) {
	t.Parallel()

	adapter := New(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/health" {
			t.Fatalf("expected path /v1/health, got %q", r.URL.Path)
		}

		if r.URL.RawQuery != "status=open" {
			t.Fatalf("expected query status=open, got %q", r.URL.RawQuery)
		}

		w.Header().Set("Content-Type", "application/json")
		http.SetCookie(w, &http.Cookie{Name: "session", Value: "abc123", Path: "/"})
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	}))

	response, err := adapter.Proxy(context.Background(), events.APIGatewayV2HTTPRequest{
		RawPath:        "/v1/health",
		RawQueryString: "status=open",
		Headers: map[string]string{
			"host": "example.execute-api.ap-southeast-1.amazonaws.com",
		},
		RequestContext: events.APIGatewayV2HTTPRequestContext{
			HTTP: events.APIGatewayV2HTTPRequestContextHTTPDescription{
				Method: "GET",
				Path:   "/v1/health",
			},
		},
	})
	if err != nil {
		t.Fatalf("Proxy() error = %v", err)
	}

	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.StatusCode)
	}

	if response.Headers["Content-Type"] != "application/json" {
		t.Fatalf("expected content-type application/json, got %q", response.Headers["Content-Type"])
	}

	if len(response.Cookies) != 1 {
		t.Fatalf("expected 1 cookie, got %d", len(response.Cookies))
	}
}

func TestProxyDecodesBase64RequestBody(t *testing.T) {
	t.Parallel()

	var received string
	adapter := New(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer r.Body.Close()

		payload := make(map[string]string)
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("Decode() error = %v", err)
		}

		received = payload["message"]
		w.WriteHeader(http.StatusCreated)
	}))

	encodedBody := base64.StdEncoding.EncodeToString([]byte(`{"message":"hello"}`))
	response, err := adapter.Proxy(context.Background(), events.APIGatewayV2HTTPRequest{
		Body:            encodedBody,
		IsBase64Encoded: true,
		Headers: map[string]string{
			"content-type": "application/json",
			"host":         "example.execute-api.ap-southeast-1.amazonaws.com",
		},
		RequestContext: events.APIGatewayV2HTTPRequestContext{
			HTTP: events.APIGatewayV2HTTPRequestContextHTTPDescription{
				Method: "POST",
				Path:   "/v1/tickets",
			},
		},
		RawPath: "/v1/tickets",
	})
	if err != nil {
		t.Fatalf("Proxy() error = %v", err)
	}

	if response.StatusCode != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", response.StatusCode)
	}

	if received != "hello" {
		t.Fatalf("expected decoded message hello, got %q", received)
	}
}

func TestProxyStripsStagePrefixBeforeRouting(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name           string
		rawPath        string
		requestPath    string
		expectedPath   string
		expectedURI    string
		rawQueryString string
	}{
		{
			name:           "health route",
			rawPath:        "/dev/v1/health",
			requestPath:    "/dev/v1/health",
			expectedPath:   "/v1/health",
			expectedURI:    "/v1/health?source=apigw",
			rawQueryString: "source=apigw",
		},
		{
			name:         "tickets route",
			rawPath:      "/dev/v1/tickets",
			requestPath:  "/dev/v1/tickets",
			expectedPath: "/v1/tickets",
			expectedURI:  "/v1/tickets",
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			adapter := New(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path != tt.expectedPath {
					t.Fatalf("expected normalized path %q, got %q", tt.expectedPath, r.URL.Path)
				}

				if r.RequestURI != tt.expectedURI {
					t.Fatalf("expected normalized request URI %q, got %q", tt.expectedURI, r.RequestURI)
				}

				w.WriteHeader(http.StatusOK)
			}))

			response, err := adapter.Proxy(context.Background(), events.APIGatewayV2HTTPRequest{
				RawPath:        tt.rawPath,
				RawQueryString: tt.rawQueryString,
				Headers: map[string]string{
					"host": "example.execute-api.ap-southeast-1.amazonaws.com",
				},
				RequestContext: events.APIGatewayV2HTTPRequestContext{
					Stage: "dev",
					HTTP: events.APIGatewayV2HTTPRequestContextHTTPDescription{
						Method: "GET",
						Path:   tt.requestPath,
					},
				},
			})
			if err != nil {
				t.Fatalf("Proxy() error = %v", err)
			}

			if response.StatusCode != http.StatusOK {
				t.Fatalf("expected status 200, got %d", response.StatusCode)
			}
		})
	}
}
