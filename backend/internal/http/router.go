package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"opsdesk/backend/internal/auth"
	"opsdesk/backend/internal/config"
	"opsdesk/backend/internal/domain"
	"opsdesk/backend/internal/dto"
	"opsdesk/backend/internal/observability"
	"opsdesk/backend/internal/service"
	"opsdesk/backend/internal/validation"
)

type Router struct {
	config       config.Config
	validator    *validation.Validator
	ticketSvc    service.TicketService
	profileSvc   service.ProfileService
	authVerifier auth.Verifier
	basePathMux  *http.ServeMux
}

func NewRouter(cfg config.Config, validator *validation.Validator, ticketSvc service.TicketService, profileSvc service.ProfileService, authVerifier auth.Verifier, logger *slog.Logger) http.Handler {
	r := &Router{
		config:       cfg,
		validator:    validator,
		ticketSvc:    ticketSvc,
		profileSvc:   profileSvc,
		authVerifier: authVerifier,
		basePathMux:  http.NewServeMux(),
	}

	r.registerRoutes()

	rootMux := http.NewServeMux()
	rootMux.Handle(cfg.APIBasePath+"/", http.StripPrefix(cfg.APIBasePath, r.basePathMux))
	rootMux.Handle(cfg.APIBasePath, http.StripPrefix(cfg.APIBasePath, r.basePathMux))

	return withObservability(logger, rootMux)
}

func (r *Router) registerRoutes() {
	r.basePathMux.HandleFunc("/health", r.handleHealth)
	r.basePathMux.HandleFunc("/auth/me", r.requireAuth(r.handleAuthMe))
	r.basePathMux.HandleFunc("/profile/me", r.requireAuth(r.handleProfileMe))
	r.basePathMux.HandleFunc("/profiles/assignable", r.requireAuth(r.handleAssignableProfiles))
	r.basePathMux.HandleFunc("/tickets", r.requireAuth(r.handleTickets))
	r.basePathMux.HandleFunc("/tickets/", r.requireAuth(r.handleTicketByPath))
}

func (r *Router) handleHealth(w http.ResponseWriter, req *http.Request) {
	if req.Method == http.MethodOptions {
		writeNoContent(w)
		return
	}

	writeJSON(w, http.StatusOK, dto.SuccessResponse[dto.HealthResponse]{
		Data: dto.HealthResponse{
			Status: "ok",
			Env:    r.config.AppEnv,
		},
	})
}

func (r *Router) handleTickets(w http.ResponseWriter, req *http.Request) {
	if req.Method == http.MethodOptions {
		writeNoContent(w)
		return
	}

	switch req.Method {
	case http.MethodGet:
		r.handleListTickets(w, req)
	case http.MethodPost:
		r.handleCreateTicket(w, req)
	default:
		writeMethodNotAllowed(w, req)
	}
}

func (r *Router) handleAuthMe(w http.ResponseWriter, req *http.Request) {
	if req.Method == http.MethodOptions {
		writeNoContent(w)
		return
	}

	if req.Method != http.MethodGet {
		writeMethodNotAllowed(w, req)
		return
	}

	identity, ok := auth.IdentityFromContext(req.Context())
	if !ok {
		writeUnauthorized(w, req, "unauthorized", "authentication is required")
		return
	}

	writeJSON(w, http.StatusOK, dto.SuccessResponse[dto.AuthIdentityResponse]{
		Data: dto.AuthIdentityResponse{
			Subject:  identity.Subject,
			Username: identity.Username,
			Email:    identity.Email,
			Name:     identity.Name,
			TokenUse: identity.TokenUse,
			Role:     string(identity.Role),
			Groups:   identity.Groups,
		},
	})
}

func (r *Router) handleProfileMe(w http.ResponseWriter, req *http.Request) {
	if req.Method == http.MethodOptions {
		writeNoContent(w)
		return
	}

	identity, ok := auth.IdentityFromContext(req.Context())
	if !ok {
		writeUnauthorized(w, req, "unauthorized", "authentication is required")
		return
	}

	switch req.Method {
	case http.MethodGet:
		profile, err := r.profileSvc.GetCurrentProfile(req.Context(), identity)
		if err != nil {
			writeInternalError(w, req, "failed to load profile")
			return
		}

		writeJSON(w, http.StatusOK, dto.SuccessResponse[dto.ProfileResponse]{
			Data: toProfileResponse(profile),
		})
	case http.MethodPatch:
		var payload dto.UpdateProfileRequest
		if err := decodeJSON(req, &payload); err != nil {
			writeBadRequest(w, req, "invalid_json", "request body must be valid JSON", nil)
			return
		}

		if fieldErrors := r.validator.ValidateUpdateProfileRequest(payload); len(fieldErrors) > 0 {
			writeBadRequest(w, req, "validation_failed", "request validation failed", fieldErrors)
			return
		}

		profile, err := r.profileSvc.UpdateCurrentProfile(req.Context(), identity, service.UpdateProfileInput{
			DisplayName: strings.TrimSpace(payload.DisplayName),
			AvatarURL:   strings.TrimSpace(payload.AvatarURL),
		})
		if err != nil {
			writeInternalError(w, req, "failed to update profile")
			return
		}

		writeJSON(w, http.StatusOK, dto.SuccessResponse[dto.ProfileResponse]{
			Data: toProfileResponse(profile),
		})
	default:
		writeMethodNotAllowed(w, req)
	}
}

func (r *Router) handleAssignableProfiles(w http.ResponseWriter, req *http.Request) {
	if req.Method == http.MethodOptions {
		writeNoContent(w)
		return
	}

	if req.Method != http.MethodGet {
		writeMethodNotAllowed(w, req)
		return
	}

	identity, ok := auth.IdentityFromContext(req.Context())
	if !ok {
		writeUnauthorized(w, req, "unauthorized", "authentication is required")
		return
	}

	if !canAssignTicket(identity) {
		writeForbidden(w, req, "forbidden", "you do not have permission to list assignable users")
		return
	}

	users, err := r.profileSvc.ListAssignableUsers(req.Context())
	if err != nil {
		writeInternalError(w, req, "failed to load assignable users")
		return
	}

	response := make([]dto.AssignableUserResponse, 0, len(users))
	for _, user := range users {
		response = append(response, toAssignableUserResponse(user))
	}

	writeJSON(w, http.StatusOK, dto.SuccessResponse[[]dto.AssignableUserResponse]{
		Data: response,
	})
}

func (r *Router) handleTicketByPath(w http.ResponseWriter, req *http.Request) {
	if req.Method == http.MethodOptions {
		writeNoContent(w)
		return
	}

	path := strings.TrimPrefix(req.URL.Path, "/tickets/")
	path = strings.Trim(path, "/")

	if path == "" {
		writeNotFound(w, req)
		return
	}

	parts := strings.Split(path, "/")
	ticketID := parts[0]

	if len(parts) == 1 && req.Method == http.MethodGet {
		r.handleGetTicket(w, req, ticketID)
		return
	}

	if len(parts) == 2 && parts[1] == "status" && req.Method == http.MethodPatch {
		r.handleUpdateTicketStatus(w, req, ticketID)
		return
	}

	if len(parts) == 2 && parts[1] == "comments" && req.Method == http.MethodPost {
		r.handleAddComment(w, req, ticketID)
		return
	}

	if len(parts) == 2 && parts[1] == "assignment" && req.Method == http.MethodPatch {
		r.handleAssignTicket(w, req, ticketID)
		return
	}

	if len(parts) == 2 && parts[1] == "activities" && req.Method == http.MethodGet {
		r.handleListTicketActivities(w, req, ticketID)
		return
	}

	if len(parts) == 2 && parts[1] == "attachments" && req.Method == http.MethodPost {
		r.handleSaveAttachment(w, req, ticketID)
		return
	}

	if len(parts) == 3 && parts[1] == "attachments" && parts[2] == "upload-url" && req.Method == http.MethodPost {
		r.handleCreateAttachmentUploadURL(w, req, ticketID)
		return
	}

	if len(parts) == 4 && parts[1] == "attachments" && parts[3] == "download" && req.Method == http.MethodGet {
		r.handleCreateAttachmentDownloadURL(w, req, ticketID, parts[2])
		return
	}

	writeMethodNotAllowed(w, req)
}

func (r *Router) handleCreateTicket(w http.ResponseWriter, req *http.Request) {
	var payload dto.CreateTicketRequest
	if err := decodeJSON(req, &payload); err != nil {
		writeBadRequest(w, req, "invalid_json", "request body must be valid JSON", nil)
		return
	}

	if fieldErrors := r.validator.ValidateCreateTicketRequest(payload); len(fieldErrors) > 0 {
		writeBadRequest(w, req, "validation_failed", "request validation failed", fieldErrors)
		return
	}

	identity, ok := auth.IdentityFromContext(req.Context())
	if !ok {
		writeUnauthorized(w, req, "unauthorized", "authentication is required")
		return
	}

	if !canCreateTicket(identity) {
		writeForbidden(w, req, "forbidden", "you do not have permission to create tickets")
		return
	}

	reporterName := strings.TrimSpace(payload.ReporterName)
	reporterEmail := strings.TrimSpace(payload.ReporterEmail)
	currentProfile := r.currentProfile(req.Context(), identity)
	if identity.Role == auth.RoleReporter {
		reporterEmail = identity.Email
		reporterName = currentProfile.DisplayName
	}

	ticket, err := r.ticketSvc.CreateTicket(req.Context(), service.CreateTicketInput{
		Title:          strings.TrimSpace(payload.Title),
		Description:    strings.TrimSpace(payload.Description),
		Priority:       domain.TicketPriority(payload.Priority),
		CreatedBy:      identity.Subject,
		CreatedByName:  currentProfile.DisplayName,
		CreatedByEmail: identity.Email,
		CreatedByRole:  string(identity.Role),
		ReporterID:     reporterIDFor(identity, reporterEmail),
		ReporterName:   reporterName,
		ReporterEmail:  reporterEmail,
	})
	if err != nil {
		writeServiceError(w, req, err)
		return
	}

	observability.LoggerFromContext(req.Context()).Info("ticket created",
		slog.String("event", "business.ticket_created"),
		slog.String("ticketId", ticket.ID),
		slog.String("actorId", identity.Subject),
		slog.String("actorRole", string(identity.Role)),
	)

	writeJSON(w, http.StatusCreated, dto.SuccessResponse[dto.TicketResponse]{
		Data: toTicketResponse(ticket),
	})
}

func (r *Router) handleListTickets(w http.ResponseWriter, req *http.Request) {
	identity, ok := auth.IdentityFromContext(req.Context())
	if !ok {
		writeUnauthorized(w, req, "unauthorized", "authentication is required")
		return
	}

	query := parseListTicketsQuery(req)
	if fieldErrors := r.validator.ValidateListTicketsQuery(query); len(fieldErrors) > 0 {
		writeBadRequest(w, req, "validation_failed", "request validation failed", fieldErrors)
		return
	}

	reporterEmail := ""
	if identity.Role == auth.RoleReporter {
		reporterEmail = identity.Email
	}

	assigneeID, unassignedOnly := resolveAssigneeFilter(identity, query.Assignee, query.AssignedToMe)

	tickets, err := r.ticketSvc.ListTickets(req.Context(), service.ListTicketsInput{
		Query:          query.Q,
		Status:         domain.TicketStatus(query.Status),
		Priority:       domain.TicketPriority(query.Priority),
		ReporterEmail:  reporterEmail,
		AssigneeID:     assigneeID,
		UnassignedOnly: unassignedOnly,
		Page:           query.Page,
		PageSize:       query.PageSize,
		SortBy:         query.SortBy,
		SortOrder:      query.SortOrder,
	})
	if err != nil {
		writeServiceError(w, req, err)
		return
	}

	response := make([]dto.TicketResponse, 0, len(tickets.Items))
	for _, ticket := range tickets.Items {
		response = append(response, toTicketResponse(ticket))
	}

	writeJSON(w, http.StatusOK, dto.SuccessResponse[dto.TicketListResponse]{
		Data: dto.TicketListResponse{
			Items: response,
			Pagination: dto.TicketListPagination{
				Page:       tickets.Page,
				PageSize:   tickets.PageSize,
				TotalItems: tickets.TotalItems,
				TotalPages: tickets.TotalPages,
				HasNext:    tickets.HasNext,
			},
		},
	})
}

func (r *Router) handleGetTicket(w http.ResponseWriter, req *http.Request, ticketID string) {
	identity, ok := auth.IdentityFromContext(req.Context())
	if !ok {
		writeUnauthorized(w, req, "unauthorized", "authentication is required")
		return
	}

	ticket, err := r.ticketSvc.GetTicket(req.Context(), ticketID)
	if err != nil {
		writeServiceError(w, req, err)
		return
	}

	if !canViewTicket(identity, ticket) {
		writeForbidden(w, req, "forbidden", "you do not have permission to view this ticket")
		return
	}

	writeJSON(w, http.StatusOK, dto.SuccessResponse[dto.TicketResponse]{
		Data: toTicketResponse(ticket),
	})
}

func (r *Router) handleUpdateTicketStatus(w http.ResponseWriter, req *http.Request, ticketID string) {
	var payload dto.UpdateTicketStatusRequest
	if err := decodeJSON(req, &payload); err != nil {
		writeBadRequest(w, req, "invalid_json", "request body must be valid JSON", nil)
		return
	}

	if fieldErrors := r.validator.ValidateUpdateTicketStatusRequest(payload); len(fieldErrors) > 0 {
		writeBadRequest(w, req, "validation_failed", "request validation failed", fieldErrors)
		return
	}

	identity, ok := auth.IdentityFromContext(req.Context())
	if !ok {
		writeUnauthorized(w, req, "unauthorized", "authentication is required")
		return
	}

	if !canUpdateTicketStatus(identity) {
		writeForbidden(w, req, "forbidden", "you do not have permission to update ticket status")
		return
	}

	if _, err := r.ticketSvc.GetTicket(req.Context(), ticketID); err != nil {
		writeServiceError(w, req, err)
		return
	}

	ticket, err := r.ticketSvc.UpdateTicketStatus(req.Context(), ticketID, service.UpdateTicketStatusInput{
		Status:    domain.TicketStatus(payload.Status),
		ActorID:   identity.Subject,
		ActorName: r.currentProfile(req.Context(), identity).DisplayName,
		ActorRole: string(identity.Role),
	})
	if err != nil {
		writeServiceError(w, req, err)
		return
	}

	observability.LoggerFromContext(req.Context()).Info("ticket status updated",
		slog.String("event", "business.ticket_status_updated"),
		slog.String("ticketId", ticket.ID),
		slog.String("actorId", identity.Subject),
		slog.String("actorRole", string(identity.Role)),
		slog.String("status", string(ticket.Status)),
	)

	writeJSON(w, http.StatusOK, dto.SuccessResponse[dto.TicketResponse]{
		Data: toTicketResponse(ticket),
	})
}

func (r *Router) handleAddComment(w http.ResponseWriter, req *http.Request, ticketID string) {
	var payload dto.AddCommentRequest
	if err := decodeJSON(req, &payload); err != nil {
		writeBadRequest(w, req, "invalid_json", "request body must be valid JSON", nil)
		return
	}

	if fieldErrors := r.validator.ValidateAddCommentRequest(payload); len(fieldErrors) > 0 {
		writeBadRequest(w, req, "validation_failed", "request validation failed", fieldErrors)
		return
	}

	identity, ok := auth.IdentityFromContext(req.Context())
	if !ok {
		writeUnauthorized(w, req, "unauthorized", "authentication is required")
		return
	}

	ticket, err := r.ticketSvc.GetTicket(req.Context(), ticketID)
	if err != nil {
		writeServiceError(w, req, err)
		return
	}

	if !canAddComment(identity, ticket) {
		writeForbidden(w, req, "forbidden", "you do not have permission to comment on this ticket")
		return
	}

	comment, err := r.ticketSvc.AddComment(req.Context(), ticketID, service.AddCommentInput{
		Message:    strings.TrimSpace(payload.Message),
		AuthorName: strings.TrimSpace(payload.AuthorName),
		ActorID:    identity.Subject,
		ActorName:  r.currentProfile(req.Context(), identity).DisplayName,
		ActorRole:  string(identity.Role),
	})
	if err != nil {
		writeServiceError(w, req, err)
		return
	}

	observability.LoggerFromContext(req.Context()).Info("ticket comment added",
		slog.String("event", "business.ticket_comment_added"),
		slog.String("ticketId", ticketID),
		slog.String("commentId", comment.ID),
		slog.String("actorId", identity.Subject),
		slog.String("actorRole", string(identity.Role)),
	)

	writeJSON(w, http.StatusCreated, dto.SuccessResponse[dto.CommentResponse]{
		Data: toCommentResponse(comment),
	})
}

func (r *Router) handleAssignTicket(w http.ResponseWriter, req *http.Request, ticketID string) {
	var payload dto.AssignTicketRequest
	if err := decodeJSON(req, &payload); err != nil {
		writeBadRequest(w, req, "invalid_json", "request body must be valid JSON", nil)
		return
	}

	if fieldErrors := r.validator.ValidateAssignTicketRequest(payload); len(fieldErrors) > 0 {
		writeBadRequest(w, req, "validation_failed", "request validation failed", fieldErrors)
		return
	}

	identity, ok := auth.IdentityFromContext(req.Context())
	if !ok {
		writeUnauthorized(w, req, "unauthorized", "authentication is required")
		return
	}

	if !canAssignTicket(identity) {
		writeForbidden(w, req, "forbidden", "you do not have permission to assign this ticket")
		return
	}

	assigneeID := identity.Subject
	assigneeName := r.currentProfile(req.Context(), identity).DisplayName
	if strings.TrimSpace(payload.AssigneeID) != "" {
		assignableUsers, err := r.profileSvc.ListAssignableUsers(req.Context())
		if err != nil {
			writeInternalError(w, req, "failed to load assignable users")
			return
		}

		targetAssigneeID := strings.TrimSpace(payload.AssigneeID)
		found := false
		for _, user := range assignableUsers {
			if strings.TrimSpace(user.Subject) != targetAssigneeID {
				continue
			}

			assigneeID = user.Subject
			assigneeName = user.DisplayName
			found = true
			break
		}

		if !found {
			writeBadRequest(w, req, "validation_failed", "request validation failed", []dto.FieldError{
				{Field: "assigneeId", Message: "assigneeId must reference an eligible operator"},
			})
			return
		}
	}

	ticket, err := r.ticketSvc.AssignTicket(req.Context(), ticketID, service.AssignTicketInput{
		AssigneeID:   assigneeID,
		AssigneeName: assigneeName,
		ActorID:      identity.Subject,
		ActorName:    r.currentProfile(req.Context(), identity).DisplayName,
		ActorRole:    string(identity.Role),
	})
	if err != nil {
		writeServiceError(w, req, err)
		return
	}

	observability.LoggerFromContext(req.Context()).Info("ticket assigned",
		slog.String("event", "business.ticket_assigned"),
		slog.String("ticketId", ticket.ID),
		slog.String("assigneeId", ticket.AssigneeID),
		slog.String("actorId", identity.Subject),
		slog.String("actorRole", string(identity.Role)),
	)

	writeJSON(w, http.StatusOK, dto.SuccessResponse[dto.TicketResponse]{
		Data: toTicketResponse(ticket),
	})
}

func (r *Router) handleListTicketActivities(w http.ResponseWriter, req *http.Request, ticketID string) {
	identity, ok := auth.IdentityFromContext(req.Context())
	if !ok {
		writeUnauthorized(w, req, "unauthorized", "authentication is required")
		return
	}

	ticket, err := r.ticketSvc.GetTicket(req.Context(), ticketID)
	if err != nil {
		writeServiceError(w, req, err)
		return
	}

	if !canViewTicket(identity, ticket) {
		writeForbidden(w, req, "forbidden", "you do not have permission to view this ticket")
		return
	}

	activities, err := r.ticketSvc.ListTicketActivities(req.Context(), ticketID)
	if err != nil {
		writeServiceError(w, req, err)
		return
	}

	response := make([]dto.TicketActivityResponse, 0, len(activities))
	for _, activity := range activities {
		response = append(response, toTicketActivityResponse(activity))
	}

	writeJSON(w, http.StatusOK, dto.SuccessResponse[[]dto.TicketActivityResponse]{
		Data: response,
	})
}

func (r *Router) handleCreateAttachmentUploadURL(w http.ResponseWriter, req *http.Request, ticketID string) {
	var payload dto.RequestAttachmentUploadURLRequest
	if err := decodeJSON(req, &payload); err != nil {
		writeBadRequest(w, req, "invalid_json", "request body must be valid JSON", nil)
		return
	}

	if fieldErrors := r.validator.ValidateRequestAttachmentUploadURLRequest(payload); len(fieldErrors) > 0 {
		writeBadRequest(w, req, "validation_failed", "request validation failed", fieldErrors)
		return
	}

	identity, ok := auth.IdentityFromContext(req.Context())
	if !ok {
		writeUnauthorized(w, req, "unauthorized", "authentication is required")
		return
	}

	ticket, err := r.ticketSvc.GetTicket(req.Context(), ticketID)
	if err != nil {
		writeServiceError(w, req, err)
		return
	}

	if !canAddComment(identity, ticket) {
		writeForbidden(w, req, "forbidden", "you do not have permission to add attachments to this ticket")
		return
	}

	upload, err := r.ticketSvc.CreateAttachmentUploadURL(req.Context(), ticketID, service.AttachmentUploadURLInput{
		FileName:    strings.TrimSpace(payload.FileName),
		ContentType: strings.TrimSpace(payload.ContentType),
		SizeBytes:   payload.SizeBytes,
	})
	if err != nil {
		observability.LoggerFromContext(req.Context()).Warn("attachment upload URL generation failed",
			slog.String("event", "business.attachment_upload_url_failed"),
			slog.String("ticketId", ticketID),
			slog.String("actorId", identity.Subject),
			slog.String("actorRole", string(identity.Role)),
			slog.String("error", err.Error()),
		)
		writeServiceError(w, req, err)
		return
	}

	observability.LoggerFromContext(req.Context()).Info("attachment upload URL generated",
		slog.String("event", "business.attachment_upload_url_created"),
		slog.String("ticketId", ticketID),
		slog.String("attachmentId", upload.AttachmentID),
		slog.String("actorId", identity.Subject),
		slog.String("actorRole", string(identity.Role)),
	)

	writeJSON(w, http.StatusOK, dto.SuccessResponse[dto.RequestAttachmentUploadURLResponse]{
		Data: dto.RequestAttachmentUploadURLResponse{
			AttachmentID:  upload.AttachmentID,
			ObjectKey:     upload.ObjectKey,
			UploadURL:     upload.UploadURL,
			UploadMethod:  upload.UploadMethod,
			UploadHeaders: upload.UploadHeaders,
			ExpiresAt:     upload.ExpiresAt,
		},
	})
}

func (r *Router) handleSaveAttachment(w http.ResponseWriter, req *http.Request, ticketID string) {
	var payload dto.SaveAttachmentRequest
	if err := decodeJSON(req, &payload); err != nil {
		writeBadRequest(w, req, "invalid_json", "request body must be valid JSON", nil)
		return
	}

	if fieldErrors := r.validator.ValidateSaveAttachmentRequest(payload); len(fieldErrors) > 0 {
		writeBadRequest(w, req, "validation_failed", "request validation failed", fieldErrors)
		return
	}

	identity, ok := auth.IdentityFromContext(req.Context())
	if !ok {
		writeUnauthorized(w, req, "unauthorized", "authentication is required")
		return
	}

	ticket, err := r.ticketSvc.GetTicket(req.Context(), ticketID)
	if err != nil {
		writeServiceError(w, req, err)
		return
	}

	if !canAddComment(identity, ticket) {
		writeForbidden(w, req, "forbidden", "you do not have permission to add attachments to this ticket")
		return
	}

	attachment, err := r.ticketSvc.SaveAttachment(req.Context(), ticketID, service.SaveAttachmentInput{
		AttachmentID: strings.TrimSpace(payload.AttachmentID),
		ObjectKey:    strings.TrimSpace(payload.ObjectKey),
		FileName:     strings.TrimSpace(payload.FileName),
		ActorID:      identity.Subject,
		ActorName:    r.currentProfile(req.Context(), identity).DisplayName,
		ActorRole:    string(identity.Role),
	})
	if err != nil {
		observability.LoggerFromContext(req.Context()).Warn("attachment save failed",
			slog.String("event", "business.attachment_save_failed"),
			slog.String("ticketId", ticketID),
			slog.String("attachmentId", strings.TrimSpace(payload.AttachmentID)),
			slog.String("actorId", identity.Subject),
			slog.String("actorRole", string(identity.Role)),
			slog.String("error", err.Error()),
		)
		writeServiceError(w, req, err)
		return
	}

	observability.LoggerFromContext(req.Context()).Info("attachment saved",
		slog.String("event", "business.attachment_saved"),
		slog.String("ticketId", ticketID),
		slog.String("attachmentId", attachment.ID),
		slog.String("actorId", identity.Subject),
		slog.String("actorRole", string(identity.Role)),
	)

	writeJSON(w, http.StatusCreated, dto.SuccessResponse[dto.AttachmentResponse]{
		Data: toAttachmentResponse(attachment),
	})
}

func (r *Router) handleCreateAttachmentDownloadURL(w http.ResponseWriter, req *http.Request, ticketID string, attachmentID string) {
	identity, ok := auth.IdentityFromContext(req.Context())
	if !ok {
		writeUnauthorized(w, req, "unauthorized", "authentication is required")
		return
	}

	ticket, err := r.ticketSvc.GetTicket(req.Context(), ticketID)
	if err != nil {
		writeServiceError(w, req, err)
		return
	}

	if !canViewTicket(identity, ticket) {
		writeForbidden(w, req, "forbidden", "you do not have permission to view this ticket")
		return
	}

	download, err := r.ticketSvc.CreateAttachmentDownloadURL(req.Context(), ticketID, attachmentID)
	if err != nil {
		observability.LoggerFromContext(req.Context()).Warn("attachment download URL generation failed",
			slog.String("event", "business.attachment_download_url_failed"),
			slog.String("ticketId", ticketID),
			slog.String("attachmentId", attachmentID),
			slog.String("actorId", identity.Subject),
			slog.String("actorRole", string(identity.Role)),
			slog.String("error", err.Error()),
		)
		writeServiceError(w, req, err)
		return
	}

	observability.LoggerFromContext(req.Context()).Info("attachment download URL generated",
		slog.String("event", "business.attachment_download_url_created"),
		slog.String("ticketId", ticketID),
		slog.String("attachmentId", attachmentID),
		slog.String("actorId", identity.Subject),
		slog.String("actorRole", string(identity.Role)),
	)

	writeJSON(w, http.StatusOK, dto.SuccessResponse[dto.AttachmentDownloadURLResponse]{
		Data: dto.AttachmentDownloadURLResponse{
			FileName:    download.FileName,
			DownloadURL: download.DownloadURL,
			ExpiresAt:   download.ExpiresAt,
		},
	})
}

func decodeJSON(req *http.Request, target any) error {
	decoder := json.NewDecoder(req.Body)
	decoder.DisallowUnknownFields()

	return decoder.Decode(target)
}

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeBadRequest(w http.ResponseWriter, req *http.Request, code, message string, details []dto.FieldError) {
	writeError(w, req, http.StatusBadRequest, code, message, details)
}

func writeNotFound(w http.ResponseWriter, req *http.Request) {
	writeError(w, req, http.StatusNotFound, "not_found", "resource not found", nil)
}

func writeMethodNotAllowed(w http.ResponseWriter, req *http.Request) {
	writeError(w, req, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed", nil)
}

func writeUnauthorized(w http.ResponseWriter, req *http.Request, code, message string) {
	writeError(w, req, http.StatusUnauthorized, code, message, nil)
}

func writeForbidden(w http.ResponseWriter, req *http.Request, code, message string) {
	writeError(w, req, http.StatusForbidden, code, message, nil)
}

func writeNoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

func writeServiceError(w http.ResponseWriter, req *http.Request, err error) {
	switch {
	case errors.Is(err, service.ErrTicketNotFound):
		writeError(w, req, http.StatusNotFound, "ticket_not_found", "ticket not found", nil)
	case errors.Is(err, service.ErrNotImplemented):
		writeError(w, req, http.StatusNotImplemented, "not_implemented", "feature is not implemented yet", nil)
	case errors.Is(err, service.ErrAttachmentNotFound):
		writeError(w, req, http.StatusNotFound, "attachment_not_found", "attachment not found", nil)
	case errors.Is(err, service.ErrAttachmentInvalid):
		writeError(w, req, http.StatusBadRequest, "invalid_attachment", "attachment request is invalid", nil)
	case errors.Is(err, service.ErrAttachmentTooLarge):
		writeError(w, req, http.StatusBadRequest, "attachment_too_large", "attachment exceeds the allowed size limit", nil)
	case errors.Is(err, service.ErrAttachmentContentTypeNotAllowed):
		writeError(w, req, http.StatusBadRequest, "attachment_content_type_not_allowed", "attachment content type is not allowed", nil)
	case errors.Is(err, service.ErrAttachmentUploadMissing):
		writeError(w, req, http.StatusBadRequest, "attachment_upload_missing", "attachment upload was not found in storage", nil)
	case errors.Is(err, service.ErrAttachmentStorageUnavailable):
		writeError(w, req, http.StatusInternalServerError, "attachment_storage_unavailable", "attachment storage is not configured", nil)
	default:
		writeInternalError(w, req, "internal server error")
	}
}

func writeInternalError(w http.ResponseWriter, req *http.Request, message string) {
	writeError(w, req, http.StatusInternalServerError, "internal_error", message, nil)
}

func writeError(w http.ResponseWriter, req *http.Request, statusCode int, code, message string, details []dto.FieldError) {
	requestID := ""
	if req != nil {
		requestID = observability.RequestIDFromContext(req.Context())
	}

	writeJSON(w, statusCode, dto.ErrorResponse{
		Error: dto.ErrorBody{
			Code:      code,
			Message:   message,
			RequestID: requestID,
			Details:   details,
		},
	})
}

func (r *Router) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		if req.Method == http.MethodOptions {
			next(w, req)
			return
		}

		token, err := auth.ExtractBearerToken(req.Header.Get("Authorization"))
		if err != nil {
			observability.LoggerFromContext(req.Context()).Warn("authentication failed",
				slog.String("event", "auth.failure"),
				slog.String("reason", "missing_or_invalid_authorization_header"),
				slog.String("path", req.URL.Path),
			)
			writeUnauthorized(w, req, "unauthorized", "authentication is required")
			return
		}

		identity, err := r.authVerifier.VerifyToken(req.Context(), token)
		if err != nil {
			observability.LoggerFromContext(req.Context()).Warn("authentication failed",
				slog.String("event", "auth.failure"),
				slog.String("reason", "invalid_or_expired_token"),
				slog.String("path", req.URL.Path),
			)
			writeUnauthorized(w, req, "invalid_token", "authentication token is invalid or expired")
			return
		}

		next(w, req.WithContext(auth.WithIdentity(req.Context(), identity)))
	}
}

func reporterIDFor(identity auth.Identity, reporterEmail string) string {
	if strings.EqualFold(strings.TrimSpace(identity.Email), strings.TrimSpace(reporterEmail)) {
		return identity.Subject
	}

	return ""
}

func (r *Router) currentProfile(ctx context.Context, identity auth.Identity) dto.ProfileResponse {
	profile, err := r.profileSvc.GetCurrentProfile(ctx, identity)
	if err != nil {
		return toProfileResponse(service.DefaultProfile(identity))
	}

	return toProfileResponse(profile)
}

func toProfileResponse(profile domain.Profile) dto.ProfileResponse {
	return dto.ProfileResponse{
		Subject:     profile.Subject,
		DisplayName: profile.DisplayName,
		Email:       profile.Email,
		AvatarURL:   profile.AvatarURL,
		Role:        profile.Role,
	}
}

func parseListTicketsQuery(req *http.Request) dto.ListTicketsQuery {
	values := req.URL.Query()

	return dto.ListTicketsQuery{
		Q:            strings.TrimSpace(values.Get("q")),
		Status:       strings.TrimSpace(values.Get("status")),
		Priority:     strings.TrimSpace(values.Get("priority")),
		Assignee:     strings.TrimSpace(values.Get("assignee")),
		Page:         parsePositiveInt(values.Get("page"), 1),
		PageSize:     parsePositiveInt(values.Get("page_size"), 10),
		SortBy:       strings.TrimSpace(values.Get("sort_by")),
		SortOrder:    strings.TrimSpace(values.Get("sort_order")),
		AssignedToMe: strings.EqualFold(strings.TrimSpace(values.Get("assignedToMe")), "true"),
	}
}

func parsePositiveInt(rawValue string, fallback int) int {
	parsed, err := strconv.Atoi(strings.TrimSpace(rawValue))
	if err != nil || parsed <= 0 {
		return fallback
	}

	return parsed
}

func resolveAssigneeFilter(identity auth.Identity, assignee string, assignedToMe bool) (string, bool) {
	if assignedToMe && canAssignTicket(identity) {
		return identity.Subject, false
	}

	switch strings.ToLower(strings.TrimSpace(assignee)) {
	case "":
		return "", false
	case "me":
		if canAssignTicket(identity) {
			return identity.Subject, false
		}
		return "", false
	case "unassigned":
		return "", true
	default:
		return strings.TrimSpace(assignee), false
	}
}
