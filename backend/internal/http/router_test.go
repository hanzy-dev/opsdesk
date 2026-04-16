package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"opsdesk/backend/internal/auth"
	"opsdesk/backend/internal/config"
	"opsdesk/backend/internal/domain"
	"opsdesk/backend/internal/dto"
	"opsdesk/backend/internal/repository/memory"
	"opsdesk/backend/internal/service"
	"opsdesk/backend/internal/validation"
)

const testIDToken = "test-id-token"

func TestPatchTicketStatusReturnsUpdatedTicket(t *testing.T) {
	t.Parallel()

	repo := memory.NewTicketRepository()
	reporterRouter := newTestRouterWithRepository(testReporterIdentity(), repo)
	ticket := createTestTicket(t, reporterRouter)
	time.Sleep(1100 * time.Millisecond)

	agentRouter := newTestRouterWithRepository(testAgentIdentity(), repo)

	recorder := performRequest(t, agentRouter, http.MethodPatch, "/v1/tickets/"+ticket.ID+"/status", dto.UpdateTicketStatusRequest{
		Status: "in_progress",
	})

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	var response dto.SuccessResponse[dto.TicketResponse]
	decodeResponse(t, recorder, &response)

	if response.Data.Status != "in_progress" {
		t.Fatalf("expected updated status in_progress, got %q", response.Data.Status)
	}

	if response.Data.UpdatedAt == ticket.UpdatedAt {
		t.Fatal("expected updatedAt to change after status update")
	}
}

func TestPatchTicketStatusRejectsInvalidStatus(t *testing.T) {
	t.Parallel()

	repo := memory.NewTicketRepository()
	reporterRouter := newTestRouterWithRepository(testReporterIdentity(), repo)
	ticket := createTestTicket(t, reporterRouter)
	agentRouter := newTestRouterWithRepository(testAgentIdentity(), repo)

	recorder := performRequest(t, agentRouter, http.MethodPatch, "/v1/tickets/"+ticket.ID+"/status", dto.UpdateTicketStatusRequest{
		Status: "closed",
	})

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", recorder.Code)
	}

	var response dto.ErrorResponse
	decodeResponse(t, recorder, &response)

	if response.Error.Code != "validation_failed" {
		t.Fatalf("expected validation_failed, got %q", response.Error.Code)
	}
}

func TestPatchTicketStatusReturnsNotFoundForMissingTicket(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testAgentIdentity())

	recorder := performRequest(t, router, http.MethodPatch, "/v1/tickets/TCK-9999/status", dto.UpdateTicketStatusRequest{
		Status: "resolved",
	})

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", recorder.Code)
	}

	var response dto.ErrorResponse
	decodeResponse(t, recorder, &response)

	if response.Error.Code != "ticket_not_found" {
		t.Fatalf("expected ticket_not_found, got %q", response.Error.Code)
	}
}

func TestPostTicketCommentReturnsCreatedComment(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testReporterIdentity())
	ticket := createTestTicket(t, router)

	recorder := performRequest(t, router, http.MethodPost, "/v1/tickets/"+ticket.ID+"/comments", dto.AddCommentRequest{
		Message:    "Issue is being investigated",
		AuthorName: "Support Engineer",
	})

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", recorder.Code)
	}

	var response dto.SuccessResponse[dto.CommentResponse]
	decodeResponse(t, recorder, &response)

	if response.Data.TicketID != ticket.ID {
		t.Fatalf("expected ticket ID %q, got %q", ticket.ID, response.Data.TicketID)
	}

	if response.Data.Message != "Issue is being investigated" {
		t.Fatalf("expected comment message to match, got %q", response.Data.Message)
	}
}

func TestPostTicketCommentRejectsInvalidPayload(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testReporterIdentity())
	ticket := createTestTicket(t, router)

	recorder := performRequest(t, router, http.MethodPost, "/v1/tickets/"+ticket.ID+"/comments", dto.AddCommentRequest{
		Message:    "   ",
		AuthorName: "",
	})

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", recorder.Code)
	}

	var response dto.ErrorResponse
	decodeResponse(t, recorder, &response)

	if response.Error.Code != "validation_failed" {
		t.Fatalf("expected validation_failed, got %q", response.Error.Code)
	}

	if len(response.Error.Details) != 2 {
		t.Fatalf("expected 2 validation details, got %d", len(response.Error.Details))
	}
}

func TestPostTicketCommentReturnsNotFoundForMissingTicket(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testReporterIdentity())

	recorder := performRequest(t, router, http.MethodPost, "/v1/tickets/TCK-9999/comments", dto.AddCommentRequest{
		Message:    "Following up on the incident",
		AuthorName: "Support Engineer",
	})

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", recorder.Code)
	}

	var response dto.ErrorResponse
	decodeResponse(t, recorder, &response)

	if response.Error.Code != "ticket_not_found" {
		t.Fatalf("expected ticket_not_found, got %q", response.Error.Code)
	}
}

func TestOptionsTicketsReturnsNoContent(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testReporterIdentity())

	recorder := performRequest(t, router, http.MethodOptions, "/v1/tickets", nil)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", recorder.Code)
	}

	if recorder.Body.Len() != 0 {
		t.Fatalf("expected empty response body, got %q", recorder.Body.String())
	}
}

func TestOptionsTicketSubresourceReturnsNoContent(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testReporterIdentity())

	recorder := performRequest(t, router, http.MethodOptions, "/v1/tickets/TCK-1001/status", nil)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", recorder.Code)
	}

	if recorder.Body.Len() != 0 {
		t.Fatalf("expected empty response body, got %q", recorder.Body.String())
	}
}

func TestGetTicketsRequiresAuthentication(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testReporterIdentity())
	req := httptest.NewRequest(http.MethodGet, "/v1/tickets", nil)
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", recorder.Code)
	}

	var response dto.ErrorResponse
	decodeResponse(t, recorder, &response)

	if response.Error.Code != "unauthorized" {
		t.Fatalf("expected unauthorized error code, got %q", response.Error.Code)
	}
}

func TestGetAuthMeReturnsIdentity(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testReporterIdentity())

	recorder := performRequest(t, router, http.MethodGet, "/v1/auth/me", nil)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	var response dto.SuccessResponse[dto.AuthIdentityResponse]
	decodeResponse(t, recorder, &response)

	if response.Data.Username != "opsdesk.user@example.com" {
		t.Fatalf("expected username to match test identity, got %q", response.Data.Username)
	}

	if response.Data.Role != "reporter" {
		t.Fatalf("expected role reporter, got %q", response.Data.Role)
	}
}

func TestReporterCannotUpdateTicketStatus(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testReporterIdentity())
	ticket := createTestTicket(t, router)

	recorder := performRequest(t, router, http.MethodPatch, "/v1/tickets/"+ticket.ID+"/status", dto.UpdateTicketStatusRequest{
		Status: "resolved",
	})

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", recorder.Code)
	}
}

func TestAgentCanAssignTicketToSelf(t *testing.T) {
	t.Parallel()

	repo := memory.NewTicketRepository()
	reporterRouter := newTestRouterWithRepository(testReporterIdentity(), repo)
	ticket := createTestTicket(t, reporterRouter)
	agentRouter := newTestRouterWithRepository(testAgentIdentity(), repo)

	recorder := performRequest(t, agentRouter, http.MethodPatch, "/v1/tickets/"+ticket.ID+"/assignment", dto.AssignTicketRequest{})

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	var response dto.SuccessResponse[dto.TicketResponse]
	decodeResponse(t, recorder, &response)

	if response.Data.AssigneeID != "agent-123" {
		t.Fatalf("expected assignee agent-123, got %q", response.Data.AssigneeID)
	}

	if response.Data.AssigneeName != "OpsDesk Agent" {
		t.Fatalf("expected assignee name OpsDesk Agent, got %q", response.Data.AssigneeName)
	}
}

func TestReporterCannotAssignTicket(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testReporterIdentity())
	ticket := createTestTicket(t, router)

	recorder := performRequest(t, router, http.MethodPatch, "/v1/tickets/"+ticket.ID+"/assignment", dto.AssignTicketRequest{})

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", recorder.Code)
	}
}

func TestReporterSeesOnlyOwnTickets(t *testing.T) {
	t.Parallel()

	repo := memory.NewTicketRepository()
	reporterRouter := newTestRouterWithRepository(testReporterIdentity(), repo)

	createTestTicket(t, reporterRouter)
	if err := repo.CreateTicket(context.Background(), domain.Ticket{
		ID:            "TCK-9000",
		Title:         "Admin ticket",
		Description:   "Admin created ticket",
		Status:        domain.TicketStatusOpen,
		Priority:      domain.TicketPriorityMedium,
		ReporterName:  "Another User",
		ReporterEmail: "another.user@example.com",
		CreatedAt:     time.Now().UTC(),
		UpdatedAt:     time.Now().UTC(),
	}); err != nil {
		t.Fatalf("expected seeded admin ticket, got error %v", err)
	}

	listRecorder := performRequest(t, reporterRouter, http.MethodGet, "/v1/tickets", nil)
	if listRecorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", listRecorder.Code)
	}

	var response dto.SuccessResponse[[]dto.TicketResponse]
	decodeResponse(t, listRecorder, &response)

	if len(response.Data) != 1 {
		t.Fatalf("expected exactly 1 reporter ticket, got %d", len(response.Data))
	}

	if response.Data[0].ReporterEmail != "opsdesk.user@example.com" {
		t.Fatalf("expected own reporter email, got %q", response.Data[0].ReporterEmail)
	}
}

func TestAgentCannotCreateTicket(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testAgentIdentity())

	recorder := performRequest(t, router, http.MethodPost, "/v1/tickets", dto.CreateTicketRequest{
		Title:         "Ticket title",
		Description:   "Ticket description",
		Priority:      "high",
		ReporterName:  "OpsDesk User",
		ReporterEmail: "opsdesk.user@example.com",
	})

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", recorder.Code)
	}
}

func newTestRouter(identity auth.Identity) http.Handler {
	return newTestRouterWithRepository(identity, memory.NewTicketRepository())
}

func newTestRouterWithRepository(identity auth.Identity, repo *memory.TicketRepository) http.Handler {
	cfg := config.Config{
		AppEnv:      "test",
		APIBasePath: "/v1",
	}

	return NewRouter(
		cfg,
		validation.New(),
		service.NewTicketService(repo),
		staticVerifier{identity: identity},
	)
}

func createTestTicket(t *testing.T, router http.Handler) dto.TicketResponse {
	t.Helper()

	recorder := performRequest(t, router, http.MethodPost, "/v1/tickets", dto.CreateTicketRequest{
		Title:         "Ticket title",
		Description:   "Ticket description",
		Priority:      "high",
		ReporterName:  "OpsDesk User",
		ReporterEmail: "user@example.com",
	})

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected ticket create status 201, got %d", recorder.Code)
	}

	var response dto.SuccessResponse[dto.TicketResponse]
	decodeResponse(t, recorder, &response)

	if response.Data.CreatedBy == "" {
		t.Fatalf("expected createdBy to be set")
	}

	return response.Data
}

func performRequest(t *testing.T, router http.Handler, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()

	var requestBody *bytes.Reader
	if body == nil {
		requestBody = bytes.NewReader(nil)
	} else {
		payload, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("json.Marshal() error = %v", err)
		}

		requestBody = bytes.NewReader(payload)
	}

	req := httptest.NewRequest(method, path, requestBody)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Authorization", "Bearer "+testIDToken)

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)
	return recorder
}

func decodeResponse(t *testing.T, recorder *httptest.ResponseRecorder, target any) {
	t.Helper()

	if err := json.Unmarshal(recorder.Body.Bytes(), target); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
}

type staticVerifier struct {
	identity auth.Identity
}

func (s staticVerifier) VerifyToken(_ context.Context, token string) (auth.Identity, error) {
	if token != testIDToken {
		return auth.Identity{}, auth.ErrInvalidToken
	}

	return s.identity, nil
}

func testReporterIdentity() auth.Identity {
	return auth.Identity{
		Subject:  "user-123",
		Username: "opsdesk.user@example.com",
		Email:    "opsdesk.user@example.com",
		Name:     "OpsDesk User",
		TokenUse: "id",
		Role:     auth.RoleReporter,
		Groups:   []string{"reporter"},
	}
}

func testAgentIdentity() auth.Identity {
	return auth.Identity{
		Subject:  "agent-123",
		Username: "agent@example.com",
		Email:    "agent@example.com",
		Name:     "OpsDesk Agent",
		TokenUse: "id",
		Role:     auth.RoleAgent,
		Groups:   []string{"agent"},
	}
}

func testAdminIdentity() auth.Identity {
	return auth.Identity{
		Subject:  "admin-123",
		Username: "admin@example.com",
		Email:    "admin@example.com",
		Name:     "OpsDesk Admin",
		TokenUse: "id",
		Role:     auth.RoleAdmin,
		Groups:   []string{"admin"},
	}
}
