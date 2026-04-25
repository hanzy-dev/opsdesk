package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"opsdesk/backend/internal/auth"
	"opsdesk/backend/internal/config"
	"opsdesk/backend/internal/domain"
	"opsdesk/backend/internal/dto"
	"opsdesk/backend/internal/observability"
	"opsdesk/backend/internal/repository/memory"
	"opsdesk/backend/internal/service"
	"opsdesk/backend/internal/storage"
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

	if len(response.Error.Details) != 1 {
		t.Fatalf("expected 1 validation detail, got %d", len(response.Error.Details))
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

func TestReporterCannotCreateInternalComment(t *testing.T) {
	t.Parallel()

	repo := memory.NewTicketRepository()
	reporterRouter := newTestRouterWithRepository(testReporterIdentity(), repo)
	ticket := createTestTicket(t, reporterRouter)

	recorder := performRequest(t, reporterRouter, http.MethodPost, "/v1/tickets/"+ticket.ID+"/comments", dto.AddCommentRequest{
		Message:    "Catatan internal untuk operator",
		AuthorName: "OpsDesk User",
		Visibility: "internal",
	})

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", recorder.Code)
	}
}

func TestReporterCannotSeeInternalCommentsOrActivities(t *testing.T) {
	t.Parallel()

	repo := memory.NewTicketRepository()
	reporterRouter := newTestRouterWithRepository(testReporterIdentity(), repo)
	ticket := createTestTicket(t, reporterRouter)
	agentRouter := newTestRouterWithRepository(testAgentIdentity(), repo)

	internalCommentRecorder := performRequest(t, agentRouter, http.MethodPost, "/v1/tickets/"+ticket.ID+"/comments", dto.AddCommentRequest{
		Message:    "Catatan investigasi internal",
		AuthorName: "OpsDesk Agent",
		Visibility: "internal",
	})
	if internalCommentRecorder.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", internalCommentRecorder.Code)
	}

	detailRecorder := performRequest(t, reporterRouter, http.MethodGet, "/v1/tickets/"+ticket.ID, nil)
	if detailRecorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", detailRecorder.Code)
	}

	var ticketResponse dto.SuccessResponse[dto.TicketResponse]
	decodeResponse(t, detailRecorder, &ticketResponse)

	if len(ticketResponse.Data.Comments) != 0 {
		t.Fatalf("expected reporter to see 0 comments, got %d", len(ticketResponse.Data.Comments))
	}

	activityRecorder := performRequest(t, reporterRouter, http.MethodGet, "/v1/tickets/"+ticket.ID+"/activities", nil)
	if activityRecorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", activityRecorder.Code)
	}

	var activityResponse dto.SuccessResponse[[]dto.TicketActivityResponse]
	decodeResponse(t, activityRecorder, &activityResponse)

	for _, activity := range activityResponse.Data {
		if activity.Action == "comment_added" {
			t.Fatalf("expected internal comment activity to be hidden from reporter")
		}
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

func TestOptionsProfileMeReturnsCORSHeadersForAllowedOrigin(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testReporterIdentity())
	req := httptest.NewRequest(http.MethodOptions, "/v1/profile/me", nil)
	req.Header.Set("Origin", "https://opsdesk-teal.vercel.app")
	req.Header.Set("Access-Control-Request-Method", http.MethodGet)

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", recorder.Code)
	}

	if recorder.Header().Get("Access-Control-Allow-Origin") != "https://opsdesk-teal.vercel.app" {
		t.Fatalf("expected allowed origin header, got %q", recorder.Header().Get("Access-Control-Allow-Origin"))
	}
}

func TestGetProfileMeReturnsCORSHeadersForAllowedOrigin(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testReporterIdentity())
	req := httptest.NewRequest(http.MethodGet, "/v1/profile/me", nil)
	req.Header.Set("Authorization", "Bearer "+testIDToken)
	req.Header.Set("Origin", "https://opsdesk-teal.vercel.app")

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	if recorder.Header().Get("Access-Control-Allow-Origin") != "https://opsdesk-teal.vercel.app" {
		t.Fatalf("expected allowed origin header, got %q", recorder.Header().Get("Access-Control-Allow-Origin"))
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

	if response.Error.RequestID == "" {
		t.Fatal("expected requestId to be included in error response")
	}

	if recorder.Header().Get("X-Request-Id") == "" {
		t.Fatal("expected X-Request-Id header to be set")
	}
}

func TestGetTicketsPreservesIncomingRequestID(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testReporterIdentity())
	req := httptest.NewRequest(http.MethodGet, "/v1/tickets", nil)
	req.Header.Set("Authorization", "Bearer "+testIDToken)
	req.Header.Set("X-Request-Id", "external-ref-123")

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)

	if recorder.Header().Get("X-Request-Id") != "external-ref-123" {
		t.Fatalf("expected X-Request-Id to be preserved, got %q", recorder.Header().Get("X-Request-Id"))
	}
}

func TestSanitizedQueryKeysDoesNotReturnQueryValues(t *testing.T) {
	t.Parallel()

	got := sanitizedQueryKeys("limit=12&X-Amz-Signature=secret-signature&token=secret-token&page=1")
	want := "X-Amz-Signature,limit,page,token"

	if got != want {
		t.Fatalf("expected sanitized query keys %q, got %q", want, got)
	}

	if strings.Contains(got, "secret") || strings.Contains(got, "12") {
		t.Fatalf("expected sanitized query keys to omit query values, got %q", got)
	}
}

func TestSanitizedQueryKeysHandlesEmptyAndMalformedQuery(t *testing.T) {
	t.Parallel()

	if got := sanitizedQueryKeys(""); got != "" {
		t.Fatalf("expected empty query keys for empty query, got %q", got)
	}

	if got := sanitizedQueryKeys("%zz"); got != "<invalid>" {
		t.Fatalf("expected malformed query marker, got %q", got)
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

func TestGetProfileMeReturnsIdentityBasedProfile(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testReporterIdentity())

	recorder := performRequest(t, router, http.MethodGet, "/v1/profile/me", nil)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	var response dto.SuccessResponse[dto.ProfileResponse]
	decodeResponse(t, recorder, &response)

	if response.Data.DisplayName != "OpsDesk User" {
		t.Fatalf("expected displayName OpsDesk User, got %q", response.Data.DisplayName)
	}

	if response.Data.Email != "opsdesk.user@example.com" {
		t.Fatalf("expected profile email to match identity, got %q", response.Data.Email)
	}

	if response.Data.Role != "reporter" {
		t.Fatalf("expected profile role reporter, got %q", response.Data.Role)
	}
}

func TestGetAssignableProfilesReturnsEligibleOperators(t *testing.T) {
	t.Parallel()

	repo := memory.NewTicketRepository()
	profileRepo := memory.NewProfileRepository()
	if err := profileRepo.UpsertProfile(context.Background(), domain.Profile{
		Subject:     "agent-123",
		DisplayName: "OpsDesk Agent",
		Email:       "agent@example.com",
		Role:        "agent",
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}); err != nil {
		t.Fatalf("expected agent profile insert, got %v", err)
	}
	if err := profileRepo.UpsertProfile(context.Background(), domain.Profile{
		Subject:     "admin-123",
		DisplayName: "OpsDesk Admin",
		Email:       "admin@example.com",
		Role:        "admin",
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}); err != nil {
		t.Fatalf("expected admin profile insert, got %v", err)
	}
	if err := profileRepo.UpsertProfile(context.Background(), domain.Profile{
		Subject:     "user-123",
		DisplayName: "OpsDesk User",
		Email:       "opsdesk.user@example.com",
		Role:        "reporter",
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}); err != nil {
		t.Fatalf("expected reporter profile insert, got %v", err)
	}

	router := newTestRouterWithRepos(testAgentIdentity(), repo, profileRepo)
	recorder := performRequest(t, router, http.MethodGet, "/v1/profiles/assignable", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	var response dto.SuccessResponse[[]dto.AssignableUserResponse]
	decodeResponse(t, recorder, &response)

	if len(response.Data) != 2 {
		t.Fatalf("expected 2 assignable users, got %d", len(response.Data))
	}
}

func TestPatchProfilePersistsDisplayNameAndAvatar(t *testing.T) {
	t.Parallel()

	router := newTestRouterWithRepository(testReporterIdentity(), memory.NewTicketRepository(), staticAttachmentStorage{
		presignedDownload: storage.PresignedDownload{
			URL:       "https://example-avatar-view",
			ExpiresAt: time.Date(2026, 4, 19, 10, 5, 0, 0, time.UTC),
		},
		headMetadata: storage.ObjectMetadata{
			ContentType: "image/png",
			SizeBytes:   2048,
		},
	})

	updateRecorder := performRequest(t, router, http.MethodPatch, "/v1/profile/me", dto.UpdateProfileRequest{
		DisplayName: "Rina Aulia",
		AvatarURL:   "profiles/user-123/avatar/1713513600-rina.png",
	})

	if updateRecorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", updateRecorder.Code)
	}

	var updateResponse dto.SuccessResponse[dto.ProfileResponse]
	decodeResponse(t, updateRecorder, &updateResponse)

	if updateResponse.Data.DisplayName != "Rina Aulia" {
		t.Fatalf("expected updated displayName, got %q", updateResponse.Data.DisplayName)
	}

	if updateResponse.Data.AvatarURL != "https://example-avatar-view" {
		t.Fatalf("expected avatar URL to persist, got %q", updateResponse.Data.AvatarURL)
	}

	profileRecorder := performRequest(t, router, http.MethodGet, "/v1/profile/me", nil)
	if profileRecorder.Code != http.StatusOK {
		t.Fatalf("expected profile status 200, got %d", profileRecorder.Code)
	}

	var profileResponse dto.SuccessResponse[dto.ProfileResponse]
	decodeResponse(t, profileRecorder, &profileResponse)

	if profileResponse.Data.DisplayName != "Rina Aulia" {
		t.Fatalf("expected persisted displayName, got %q", profileResponse.Data.DisplayName)
	}

	if profileResponse.Data.AvatarURL != "https://example-avatar-view" {
		t.Fatalf("expected hydrated avatar URL, got %q", profileResponse.Data.AvatarURL)
	}

	ticket := createTestTicket(t, router)
	if ticket.CreatedByName != "Rina Aulia" {
		t.Fatalf("expected createdByName to use updated profile, got %q", ticket.CreatedByName)
	}
}

func TestProfileAvatarUploadURLReturnsPresignedTarget(t *testing.T) {
	t.Parallel()

	repo := memory.NewTicketRepository()
	router := newTestRouterWithRepository(testReporterIdentity(), repo, staticAttachmentStorage{
		presignedUpload: storage.PresignedUpload{
			ObjectKey: "profiles/user-123/avatar/1713513600-rina.png",
			URL:       "https://example-avatar-upload",
			Method:    "PUT",
			Headers:   map[string]string{"Content-Type": "image/png"},
			ExpiresAt: time.Date(2026, 4, 19, 10, 0, 0, 0, time.UTC),
		},
	})

	recorder := performRequest(t, router, http.MethodPost, "/v1/profile/me/avatar/upload-url", dto.RequestProfileAvatarUploadURLRequest{
		FileName:    "rina.png",
		ContentType: "image/png",
		SizeBytes:   2048,
	})

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	var response dto.SuccessResponse[dto.RequestProfileAvatarUploadURLResponse]
	decodeResponse(t, recorder, &response)

	if response.Data.UploadURL != "https://example-avatar-upload" {
		t.Fatalf("expected upload URL to match presigned target, got %q", response.Data.UploadURL)
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

func TestReporterCreateTicketUsesAuthenticatedReporterIdentity(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testReporterIdentity())

	recorder := performRequest(t, router, http.MethodPost, "/v1/tickets", dto.CreateTicketRequest{
		Title:         "Permintaan bantuan login",
		Description:   "Tidak bisa masuk ke portal",
		Priority:      "medium",
		Category:      "account_access",
		Team:          "helpdesk",
		ReporterName:  "",
		ReporterEmail: "",
	})

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", recorder.Code)
	}

	var response dto.SuccessResponse[dto.TicketResponse]
	decodeResponse(t, recorder, &response)

	if response.Data.ReporterName != "OpsDesk User" {
		t.Fatalf("expected reporter name from authenticated identity, got %q", response.Data.ReporterName)
	}

	if response.Data.ReporterEmail != "opsdesk.user@example.com" {
		t.Fatalf("expected reporter email from authenticated identity, got %q", response.Data.ReporterEmail)
	}
}

func TestCommentAuthorNameUsesAuthenticatedProfile(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testReporterIdentity())
	ticket := createTestTicket(t, router)

	recorder := performRequest(t, router, http.MethodPost, "/v1/tickets/"+ticket.ID+"/comments", dto.AddCommentRequest{
		Message:    "Saya menambahkan detail terbaru",
		AuthorName: "Nama Palsu",
	})

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", recorder.Code)
	}

	var response dto.SuccessResponse[dto.CommentResponse]
	decodeResponse(t, recorder, &response)

	if response.Data.AuthorName != "OpsDesk User" {
		t.Fatalf("expected author name from authenticated profile, got %q", response.Data.AuthorName)
	}
}

func TestUnauthorizedErrorIncludesRequestContext(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testReporterIdentity())
	req := httptest.NewRequest(http.MethodGet, "/v1/tickets?page=2", nil)
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", recorder.Code)
	}

	var response dto.ErrorResponse
	decodeResponse(t, recorder, &response)

	if response.Error.Status != http.StatusUnauthorized {
		t.Fatalf("expected error status 401, got %d", response.Error.Status)
	}

	if response.Error.Method != http.MethodGet {
		t.Fatalf("expected method GET, got %q", response.Error.Method)
	}

	if response.Error.Path != "/tickets" {
		t.Fatalf("expected path /tickets, got %q", response.Error.Path)
	}

	if response.Error.Timestamp == "" {
		t.Fatal("expected timestamp to be populated")
	}
}

func TestGetNotificationsRequiresAuthentication(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testReporterIdentity())
	req := httptest.NewRequest(http.MethodGet, "/v1/notifications?limit=12", nil)
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

	if response.Error.Status != http.StatusUnauthorized {
		t.Fatalf("expected error status 401, got %d", response.Error.Status)
	}
}

func TestGetNotificationsReturnsEmptyListWhenNoNotifications(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testReporterIdentity())

	recorder := performRequest(t, router, http.MethodGet, "/v1/notifications?limit=12", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	var response dto.SuccessResponse[[]dto.NotificationResponse]
	decodeResponse(t, recorder, &response)

	if response.Data == nil {
		t.Fatal("expected empty notification list, got nil")
	}

	if len(response.Data) != 0 {
		t.Fatalf("expected 0 notifications, got %d", len(response.Data))
	}
}

func TestReporterNotificationsHideInternalCommentActivity(t *testing.T) {
	t.Parallel()

	repo := memory.NewTicketRepository()
	reporterRouter := newTestRouterWithRepository(testReporterIdentity(), repo)
	ticket := createTestTicket(t, reporterRouter)
	agentRouter := newTestRouterWithRepository(testAgentIdentity(), repo)

	commentRecorder := performRequest(t, agentRouter, http.MethodPost, "/v1/tickets/"+ticket.ID+"/comments", dto.AddCommentRequest{
		Message:    "Catatan internal operator",
		AuthorName: "OpsDesk Agent",
		Visibility: "internal",
	})
	if commentRecorder.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", commentRecorder.Code)
	}

	notificationRecorder := performRequest(t, reporterRouter, http.MethodGet, "/v1/notifications?limit=10", nil)
	if notificationRecorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", notificationRecorder.Code)
	}

	var response dto.SuccessResponse[[]dto.NotificationResponse]
	decodeResponse(t, notificationRecorder, &response)

	if len(response.Data) != 0 {
		t.Fatalf("expected 0 reporter notifications for internal activity, got %d", len(response.Data))
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

	activitiesRecorder := performRequest(t, agentRouter, http.MethodGet, "/v1/tickets/"+ticket.ID+"/activities", nil)
	if activitiesRecorder.Code != http.StatusOK {
		t.Fatalf("expected activities status 200, got %d", activitiesRecorder.Code)
	}

	var activitiesResponse dto.SuccessResponse[[]dto.TicketActivityResponse]
	decodeResponse(t, activitiesRecorder, &activitiesResponse)

	if len(activitiesResponse.Data) != 2 {
		t.Fatalf("expected 2 activity entries, got %d", len(activitiesResponse.Data))
	}

	if activitiesResponse.Data[1].Action != "assignment_changed" {
		t.Fatalf("expected assignment_changed action, got %q", activitiesResponse.Data[1].Action)
	}
}

func TestAgentCanAssignTicketToAnotherEligibleUser(t *testing.T) {
	t.Parallel()

	repo := memory.NewTicketRepository()
	profileRepo := memory.NewProfileRepository()
	for _, profile := range []domain.Profile{
		{
			Subject:     "agent-123",
			DisplayName: "OpsDesk Agent",
			Email:       "agent@example.com",
			Role:        "agent",
			CreatedAt:   time.Now().UTC(),
			UpdatedAt:   time.Now().UTC(),
		},
		{
			Subject:     "admin-123",
			DisplayName: "OpsDesk Admin",
			Email:       "admin@example.com",
			Role:        "admin",
			CreatedAt:   time.Now().UTC(),
			UpdatedAt:   time.Now().UTC(),
		},
	} {
		if err := profileRepo.UpsertProfile(context.Background(), profile); err != nil {
			t.Fatalf("expected profile insert, got %v", err)
		}
	}

	reporterRouter := newTestRouterWithRepos(testReporterIdentity(), repo, profileRepo)
	ticket := createTestTicket(t, reporterRouter)
	agentRouter := newTestRouterWithRepos(testAgentIdentity(), repo, profileRepo)

	recorder := performRequest(t, agentRouter, http.MethodPatch, "/v1/tickets/"+ticket.ID+"/assignment", dto.AssignTicketRequest{
		AssigneeID: "admin-123",
	})

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	var response dto.SuccessResponse[dto.TicketResponse]
	decodeResponse(t, recorder, &response)

	if response.Data.AssigneeID != "admin-123" {
		t.Fatalf("expected assignee admin-123, got %q", response.Data.AssigneeID)
	}

	if response.Data.AssigneeName != "OpsDesk Admin" {
		t.Fatalf("expected assignee name OpsDesk Admin, got %q", response.Data.AssigneeName)
	}

	activitiesRecorder := performRequest(t, agentRouter, http.MethodGet, "/v1/tickets/"+ticket.ID+"/activities", nil)
	if activitiesRecorder.Code != http.StatusOK {
		t.Fatalf("expected activities status 200, got %d", activitiesRecorder.Code)
	}

	var activitiesResponse dto.SuccessResponse[[]dto.TicketActivityResponse]
	decodeResponse(t, activitiesRecorder, &activitiesResponse)

	if activitiesResponse.Data[1].Metadata["afterAssigneeName"] != "OpsDesk Admin" {
		t.Fatalf("expected audit trail assignee name OpsDesk Admin, got %q", activitiesResponse.Data[1].Metadata["afterAssigneeName"])
	}
}

func TestAgentSeesAssignmentNotificationWhenTicketAssignedByAdmin(t *testing.T) {
	t.Parallel()

	repo := memory.NewTicketRepository()
	profileRepo := memory.NewProfileRepository()
	for _, profile := range []domain.Profile{
		{
			Subject:     "agent-123",
			DisplayName: "OpsDesk Agent",
			Email:       "agent@example.com",
			Role:        "agent",
			CreatedAt:   time.Now().UTC(),
			UpdatedAt:   time.Now().UTC(),
		},
		{
			Subject:     "admin-123",
			DisplayName: "OpsDesk Admin",
			Email:       "admin@example.com",
			Role:        "admin",
			CreatedAt:   time.Now().UTC(),
			UpdatedAt:   time.Now().UTC(),
		},
	} {
		if err := profileRepo.UpsertProfile(context.Background(), profile); err != nil {
			t.Fatalf("expected profile insert, got %v", err)
		}
	}

	reporterRouter := newTestRouterWithRepos(testReporterIdentity(), repo, profileRepo)
	ticket := createTestTicket(t, reporterRouter)
	adminRouter := newTestRouterWithRepos(testAdminIdentity(), repo, profileRepo)
	agentRouter := newTestRouterWithRepos(testAgentIdentity(), repo, profileRepo)

	assignRecorder := performRequest(t, adminRouter, http.MethodPatch, "/v1/tickets/"+ticket.ID+"/assignment", dto.AssignTicketRequest{
		AssigneeID: "agent-123",
	})
	if assignRecorder.Code != http.StatusOK {
		t.Fatalf("expected assignment status 200, got %d", assignRecorder.Code)
	}

	notificationRecorder := performRequest(t, agentRouter, http.MethodGet, "/v1/notifications?limit=10", nil)
	if notificationRecorder.Code != http.StatusOK {
		t.Fatalf("expected notifications status 200, got %d", notificationRecorder.Code)
	}

	var response dto.SuccessResponse[[]dto.NotificationResponse]
	decodeResponse(t, notificationRecorder, &response)

	if len(response.Data) == 0 {
		t.Fatal("expected at least 1 notification")
	}

	notification := response.Data[0]
	if notification.Type != "assignment_changed" {
		t.Fatalf("expected assignment_changed notification, got %q", notification.Type)
	}

	if notification.TicketID != ticket.ID {
		t.Fatalf("expected ticket ID %q, got %q", ticket.ID, notification.TicketID)
	}

	if notification.Link != "/tickets/"+ticket.ID {
		t.Fatalf("expected notification link for ticket %q, got %q", ticket.ID, notification.Link)
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

func TestTicketActivitiesIncludeCreateStatusAndComment(t *testing.T) {
	t.Parallel()

	repo := memory.NewTicketRepository()
	reporterRouter := newTestRouterWithRepository(testReporterIdentity(), repo)
	ticket := createTestTicket(t, reporterRouter)
	agentRouter := newTestRouterWithRepository(testAgentIdentity(), repo)

	statusRecorder := performRequest(t, agentRouter, http.MethodPatch, "/v1/tickets/"+ticket.ID+"/status", dto.UpdateTicketStatusRequest{
		Status: "in_progress",
	})
	if statusRecorder.Code != http.StatusOK {
		t.Fatalf("expected status update 200, got %d", statusRecorder.Code)
	}

	commentRecorder := performRequest(t, reporterRouter, http.MethodPost, "/v1/tickets/"+ticket.ID+"/comments", dto.AddCommentRequest{
		Message:    "Reporter added more detail",
		AuthorName: "OpsDesk User",
	})
	if commentRecorder.Code != http.StatusCreated {
		t.Fatalf("expected comment create 201, got %d", commentRecorder.Code)
	}

	activitiesRecorder := performRequest(t, reporterRouter, http.MethodGet, "/v1/tickets/"+ticket.ID+"/activities", nil)
	if activitiesRecorder.Code != http.StatusOK {
		t.Fatalf("expected activities status 200, got %d", activitiesRecorder.Code)
	}

	var response dto.SuccessResponse[[]dto.TicketActivityResponse]
	decodeResponse(t, activitiesRecorder, &response)

	if len(response.Data) != 3 {
		t.Fatalf("expected 3 activities, got %d", len(response.Data))
	}

	if response.Data[0].Action != "ticket_created" {
		t.Fatalf("expected first activity ticket_created, got %q", response.Data[0].Action)
	}

	if response.Data[1].Action != "status_changed" {
		t.Fatalf("expected second activity status_changed, got %q", response.Data[1].Action)
	}

	if response.Data[2].Action != "comment_added" {
		t.Fatalf("expected third activity comment_added, got %q", response.Data[2].Action)
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

	var response dto.SuccessResponse[dto.TicketListResponse]
	decodeResponse(t, listRecorder, &response)

	if len(response.Data.Items) != 1 {
		t.Fatalf("expected exactly 1 reporter ticket, got %d", len(response.Data.Items))
	}

	if response.Data.Items[0].ReporterEmail != "opsdesk.user@example.com" {
		t.Fatalf("expected own reporter email, got %q", response.Data.Items[0].ReporterEmail)
	}
}

func TestListTicketsSupportsSearchSortingAndPagination(t *testing.T) {
	t.Parallel()

	repo := memory.NewTicketRepository()
	adminRouter := newTestRouterWithRepository(testAdminIdentity(), repo)

	for _, ticket := range []domain.Ticket{
		{
			ID:            "TCK-1001",
			Title:         "Gangguan login SSO",
			Description:   "Masalah login mahasiswa",
			Status:        domain.TicketStatusOpen,
			Priority:      domain.TicketPriorityHigh,
			ReporterName:  "Rina",
			ReporterEmail: "rina@example.com",
			CreatedAt:     time.Now().UTC().Add(-3 * time.Hour),
			UpdatedAt:     time.Now().UTC().Add(-3 * time.Hour),
		},
		{
			ID:            "TCK-1002",
			Title:         "Reset akses printer",
			Description:   "Reset printer lab",
			Status:        domain.TicketStatusResolved,
			Priority:      domain.TicketPriorityLow,
			ReporterName:  "Bagus",
			ReporterEmail: "bagus@example.com",
			CreatedAt:     time.Now().UTC().Add(-2 * time.Hour),
			UpdatedAt:     time.Now().UTC().Add(-2 * time.Hour),
		},
		{
			ID:            "TCK-1003",
			Title:         "Login gagal di portal",
			Description:   "Mahasiswa tidak bisa masuk",
			Status:        domain.TicketStatusInProgress,
			Priority:      domain.TicketPriorityMedium,
			ReporterName:  "Sinta",
			ReporterEmail: "sinta@example.com",
			CreatedAt:     time.Now().UTC().Add(-1 * time.Hour),
			UpdatedAt:     time.Now().UTC().Add(-1 * time.Hour),
		},
	} {
		if err := repo.CreateTicket(context.Background(), ticket); err != nil {
			t.Fatalf("expected seeded ticket, got error %v", err)
		}
	}

	recorder := performRequest(t, adminRouter, http.MethodGet, "/v1/tickets?q=login&sort_by=created_at&sort_order=asc&page=1&page_size=1", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	var response dto.SuccessResponse[dto.TicketListResponse]
	decodeResponse(t, recorder, &response)

	if response.Data.Pagination.TotalItems != 2 {
		t.Fatalf("expected total_items 2, got %d", response.Data.Pagination.TotalItems)
	}

	if response.Data.Pagination.TotalPages != 2 {
		t.Fatalf("expected total_pages 2, got %d", response.Data.Pagination.TotalPages)
	}

	if !response.Data.Pagination.HasNext {
		t.Fatal("expected has_next true")
	}

	if len(response.Data.Items) != 1 {
		t.Fatalf("expected 1 item on first page, got %d", len(response.Data.Items))
	}

	if response.Data.Items[0].ID != "TCK-1001" {
		t.Fatalf("expected oldest login ticket TCK-1001, got %q", response.Data.Items[0].ID)
	}
}

func TestAgentCanListAssignedTicketsForCurrentIdentity(t *testing.T) {
	t.Parallel()

	repo := memory.NewTicketRepository()
	agentRouter := newTestRouterWithRepository(testAgentIdentity(), repo)

	for _, ticket := range []domain.Ticket{
		{
			ID:           "TCK-2001",
			Title:        "Gangguan jaringan lantai 2",
			Description:  "Perlu tindak lanjut cepat",
			Status:       domain.TicketStatusInProgress,
			Priority:     domain.TicketPriorityHigh,
			AssigneeID:   "agent-123",
			AssigneeName: "OpsDesk Agent",
			AssignedAt:   time.Now().UTC().Add(-30 * time.Minute),
			CreatedAt:    time.Now().UTC().Add(-2 * time.Hour),
			UpdatedAt:    time.Now().UTC().Add(-15 * time.Minute),
		},
		{
			ID:           "TCK-2002",
			Title:        "Permintaan akses printer",
			Description:  "Belum diambil petugas",
			Status:       domain.TicketStatusOpen,
			Priority:     domain.TicketPriorityLow,
			AssigneeID:   "agent-999",
			AssigneeName: "Petugas Lain",
			AssignedAt:   time.Now().UTC().Add(-45 * time.Minute),
			CreatedAt:    time.Now().UTC().Add(-90 * time.Minute),
			UpdatedAt:    time.Now().UTC().Add(-20 * time.Minute),
		},
	} {
		if err := repo.CreateTicket(context.Background(), ticket); err != nil {
			t.Fatalf("expected seeded ticket, got error %v", err)
		}
	}

	recorder := performRequest(t, agentRouter, http.MethodGet, "/v1/tickets?assignee=me", nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	var response dto.SuccessResponse[dto.TicketListResponse]
	decodeResponse(t, recorder, &response)

	if len(response.Data.Items) != 1 {
		t.Fatalf("expected 1 assigned ticket, got %d", len(response.Data.Items))
	}

	if response.Data.Items[0].AssigneeID != "agent-123" {
		t.Fatalf("expected assignee agent-123, got %q", response.Data.Items[0].AssigneeID)
	}
}

func TestAgentCannotCreateTicket(t *testing.T) {
	t.Parallel()

	router := newTestRouter(testAgentIdentity())

	recorder := performRequest(t, router, http.MethodPost, "/v1/tickets", dto.CreateTicketRequest{
		Title:         "Ticket title",
		Description:   "Ticket description",
		Priority:      "high",
		Category:      "service_request",
		Team:          "operations",
		ReporterName:  "OpsDesk User",
		ReporterEmail: "opsdesk.user@example.com",
	})

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", recorder.Code)
	}
}

func TestReporterCanUploadAndOpenAttachment(t *testing.T) {
	t.Parallel()

	repo := memory.NewTicketRepository()
	attachmentStorage := staticAttachmentStorage{
		presignedUpload: storage.PresignedUpload{
			ObjectKey: "tickets/TCK-0001/attachments/ATT-0001/evidence.pdf",
			URL:       "https://example-upload-url",
			Method:    "PUT",
			Headers:   map[string]string{"Content-Type": "application/pdf"},
			ExpiresAt: time.Date(2026, 4, 16, 10, 0, 0, 0, time.UTC),
		},
		presignedDownload: storage.PresignedDownload{
			URL:       "https://example-download-url",
			ExpiresAt: time.Date(2026, 4, 16, 10, 5, 0, 0, time.UTC),
		},
		headMetadata: storage.ObjectMetadata{
			ContentType: "application/pdf",
			SizeBytes:   4096,
		},
	}

	reporterRouter := newTestRouterWithRepository(testReporterIdentity(), repo, attachmentStorage)
	ticket := createTestTicket(t, reporterRouter)

	uploadURLRecorder := performRequest(t, reporterRouter, http.MethodPost, "/v1/tickets/"+ticket.ID+"/attachments/upload-url", dto.RequestAttachmentUploadURLRequest{
		FileName:    "evidence.pdf",
		ContentType: "application/pdf",
		SizeBytes:   4096,
	})
	if uploadURLRecorder.Code != http.StatusOK {
		t.Fatalf("expected upload-url status 200, got %d", uploadURLRecorder.Code)
	}

	var uploadURLResponse dto.SuccessResponse[dto.RequestAttachmentUploadURLResponse]
	decodeResponse(t, uploadURLRecorder, &uploadURLResponse)

	saveRecorder := performRequest(t, reporterRouter, http.MethodPost, "/v1/tickets/"+ticket.ID+"/attachments", dto.SaveAttachmentRequest{
		AttachmentID: uploadURLResponse.Data.AttachmentID,
		ObjectKey:    uploadURLResponse.Data.ObjectKey,
		FileName:     "evidence.pdf",
	})
	if saveRecorder.Code != http.StatusCreated {
		t.Fatalf("expected save attachment status 201, got %d", saveRecorder.Code)
	}

	detailRecorder := performRequest(t, reporterRouter, http.MethodGet, "/v1/tickets/"+ticket.ID, nil)
	if detailRecorder.Code != http.StatusOK {
		t.Fatalf("expected detail status 200, got %d", detailRecorder.Code)
	}

	var detailResponse dto.SuccessResponse[dto.TicketResponse]
	decodeResponse(t, detailRecorder, &detailResponse)

	if len(detailResponse.Data.Attachments) != 1 {
		t.Fatalf("expected 1 attachment, got %d", len(detailResponse.Data.Attachments))
	}

	downloadRecorder := performRequest(t, reporterRouter, http.MethodGet, "/v1/tickets/"+ticket.ID+"/attachments/"+detailResponse.Data.Attachments[0].ID+"/download", nil)
	if downloadRecorder.Code != http.StatusOK {
		t.Fatalf("expected download status 200, got %d", downloadRecorder.Code)
	}

	var downloadResponse dto.SuccessResponse[dto.AttachmentDownloadURLResponse]
	decodeResponse(t, downloadRecorder, &downloadResponse)

	if downloadResponse.Data.DownloadURL != "https://example-download-url" {
		t.Fatalf("expected presigned download url, got %q", downloadResponse.Data.DownloadURL)
	}

	activityRecorder := performRequest(t, reporterRouter, http.MethodGet, "/v1/tickets/"+ticket.ID+"/activities", nil)
	if activityRecorder.Code != http.StatusOK {
		t.Fatalf("expected activity status 200, got %d", activityRecorder.Code)
	}

	var activityResponse dto.SuccessResponse[[]dto.TicketActivityResponse]
	decodeResponse(t, activityRecorder, &activityResponse)

	if len(activityResponse.Data) != 2 {
		t.Fatalf("expected 2 activity entries, got %d", len(activityResponse.Data))
	}

	if activityResponse.Data[1].Action != "attachment_added" {
		t.Fatalf("expected attachment_added activity, got %q", activityResponse.Data[1].Action)
	}
}

func newTestRouter(identity auth.Identity) http.Handler {
	return newTestRouterWithRepos(identity, memory.NewTicketRepository(), memory.NewProfileRepository())
}

func newTestRouterWithRepository(identity auth.Identity, repo *memory.TicketRepository, attachmentStorages ...storage.AttachmentStorage) http.Handler {
	return newTestRouterWithRepos(identity, repo, memory.NewProfileRepository(), attachmentStorages...)
}

func newTestRouterWithRepos(identity auth.Identity, repo *memory.TicketRepository, profileRepo *memory.ProfileRepository, attachmentStorages ...storage.AttachmentStorage) http.Handler {
	cfg := config.Config{
		AppEnv:               "test",
		APIBasePath:          "/v1",
		FrontendOrigin:       "https://opsdesk-teal.vercel.app",
		ProfileTableName:     "opsdesk-test-profiles",
		AttachmentBucketName: "opsdesk-test-attachments",
	}

	return NewRouter(
		cfg,
		validation.New(),
		service.NewTicketService(repo, attachmentStorages...),
		service.NewProfileService(profileRepo, attachmentStorages...),
		staticVerifier{identity: identity},
		observability.NewLogger("error", "test"),
	)
}

func createTestTicket(t *testing.T, router http.Handler) dto.TicketResponse {
	t.Helper()

	recorder := performRequest(t, router, http.MethodPost, "/v1/tickets", dto.CreateTicketRequest{
		Title:         "Ticket title",
		Description:   "Ticket description",
		Priority:      "high",
		Category:      "application_bug",
		Team:          "applications",
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

type staticAttachmentStorage struct {
	presignedUpload   storage.PresignedUpload
	presignedDownload storage.PresignedDownload
	headMetadata      storage.ObjectMetadata
}

func (s staticAttachmentStorage) CreateUploadURL(context.Context, string, string) (storage.PresignedUpload, error) {
	return s.presignedUpload, nil
}

func (s staticAttachmentStorage) CreateDownloadURL(context.Context, string, string) (storage.PresignedDownload, error) {
	return s.presignedDownload, nil
}

func (s staticAttachmentStorage) HeadObject(context.Context, string) (storage.ObjectMetadata, error) {
	return s.headMetadata, nil
}
