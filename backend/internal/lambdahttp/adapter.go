package lambdahttp

import (
	"context"
	"encoding/base64"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"

	"github.com/aws/aws-lambda-go/events"
)

type Adapter struct {
	handler http.Handler
}

func New(handler http.Handler) *Adapter {
	return &Adapter{handler: handler}
}

func (a *Adapter) Proxy(ctx context.Context, event events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	req, err := newRequest(ctx, event)
	if err != nil {
		return events.APIGatewayV2HTTPResponse{}, err
	}

	recorder := httptest.NewRecorder()
	a.handler.ServeHTTP(recorder, req)

	response := recorder.Result()
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return events.APIGatewayV2HTTPResponse{}, err
	}

	headers := make(map[string]string, len(response.Header))
	cookies := make([]string, 0)
	for key, values := range response.Header {
		if strings.EqualFold(key, "Set-Cookie") {
			cookies = append(cookies, values...)
			continue
		}

		headers[key] = strings.Join(values, ", ")
	}

	return events.APIGatewayV2HTTPResponse{
		StatusCode:      response.StatusCode,
		Headers:         headers,
		Cookies:         cookies,
		Body:            string(body),
		IsBase64Encoded: false,
	}, nil
}

func newRequest(ctx context.Context, event events.APIGatewayV2HTTPRequest) (*http.Request, error) {
	body := event.Body
	if event.IsBase64Encoded {
		decoded, err := base64.StdEncoding.DecodeString(event.Body)
		if err != nil {
			return nil, err
		}

		body = string(decoded)
	}

	path := normalizedPath(event)

	rawQuery := event.RawQueryString
	if rawQuery == "" && len(event.QueryStringParameters) > 0 {
		values := url.Values{}
		for key, value := range event.QueryStringParameters {
			values.Set(key, value)
		}
		rawQuery = values.Encode()
	}

	host := event.RequestContext.DomainName
	if host == "" {
		host = event.Headers["host"]
	}
	if host == "" {
		host = "lambda.internal"
	}

	targetURL := "https://" + host + path
	if rawQuery != "" {
		targetURL += "?" + rawQuery
	}

	req, err := http.NewRequestWithContext(ctx, event.RequestContext.HTTP.Method, targetURL, strings.NewReader(body))
	if err != nil {
		return nil, err
	}

	for key, value := range event.Headers {
		req.Header.Set(key, value)
	}

	for _, cookie := range event.Cookies {
		req.Header.Add("Cookie", cookie)
	}

	req.RequestURI = path
	if rawQuery != "" {
		req.RequestURI += "?" + rawQuery
	}

	return req, nil
}

func normalizedPath(event events.APIGatewayV2HTTPRequest) string {
	path := event.RawPath
	if path == "" {
		path = event.RequestContext.HTTP.Path
	}

	return stripStagePrefix(path, event.RequestContext.Stage)
}

func stripStagePrefix(path, stage string) string {
	if path == "" {
		return "/"
	}

	if stage == "" || stage == "$default" {
		return path
	}

	stagePrefix := "/" + strings.TrimPrefix(stage, "/")
	if path == stagePrefix {
		return "/"
	}

	if strings.HasPrefix(path, stagePrefix+"/") {
		return strings.TrimPrefix(path, stagePrefix)
	}

	return path
}
