package validation

import (
	"net/url"
	"strings"
	"unicode/utf8"

	"opsdesk/backend/internal/domain"
	"opsdesk/backend/internal/dto"
)

type Validator struct{}

func New() *Validator {
	return &Validator{}
}

func (v *Validator) ValidateCreateTicketRequest(input dto.CreateTicketRequest) []dto.FieldError {
	var errs []dto.FieldError

	if strings.TrimSpace(input.Title) == "" {
		errs = append(errs, dto.FieldError{Field: "title", Message: "title is required"})
	}

	if strings.TrimSpace(input.Description) == "" {
		errs = append(errs, dto.FieldError{Field: "description", Message: "description is required"})
	}

	if !isValidPriority(input.Priority) {
		errs = append(errs, dto.FieldError{Field: "priority", Message: "priority must be one of: low, medium, high"})
	}

	if !isValidCategory(input.Category) {
		errs = append(errs, dto.FieldError{Field: "category", Message: "category must be one of: account_access, network, hardware, application_bug, service_request, other"})
	}

	if !isValidTeam(input.Team) {
		errs = append(errs, dto.FieldError{Field: "team", Message: "team must be one of: helpdesk, infrastructure, applications, operations"})
	}

	if strings.TrimSpace(input.ReporterName) == "" {
		errs = append(errs, dto.FieldError{Field: "reporterName", Message: "reporterName is required"})
	}

	if !strings.Contains(input.ReporterEmail, "@") {
		errs = append(errs, dto.FieldError{Field: "reporterEmail", Message: "reporterEmail must be a valid email address"})
	}

	return errs
}

func (v *Validator) ValidateUpdateTicketStatusRequest(input dto.UpdateTicketStatusRequest) []dto.FieldError {
	if isValidStatus(input.Status) {
		return nil
	}

	return []dto.FieldError{
		{Field: "status", Message: "status must be one of: open, in_progress, resolved"},
	}
}

func (v *Validator) ValidateAddCommentRequest(input dto.AddCommentRequest) []dto.FieldError {
	var errs []dto.FieldError

	if strings.TrimSpace(input.Message) == "" {
		errs = append(errs, dto.FieldError{Field: "message", Message: "message is required"})
	}

	if strings.TrimSpace(input.AuthorName) == "" {
		errs = append(errs, dto.FieldError{Field: "authorName", Message: "authorName is required"})
	}

	if strings.TrimSpace(input.Visibility) != "" && !isValidCommentVisibility(input.Visibility) {
		errs = append(errs, dto.FieldError{Field: "visibility", Message: "visibility must be one of: public, internal"})
	}

	return errs
}

func (v *Validator) ValidateAssignTicketRequest(input dto.AssignTicketRequest) []dto.FieldError {
	assigneeID := strings.TrimSpace(input.AssigneeID)
	if assigneeID == "" {
		return nil
	}

	if utf8.RuneCountInString(assigneeID) > 64 || strings.ContainsAny(assigneeID, "/\\ ") {
		return []dto.FieldError{
			{Field: "assigneeId", Message: "assigneeId must be a valid operator identifier"},
		}
	}

	return nil
}

func (v *Validator) ValidateRequestAttachmentUploadURLRequest(input dto.RequestAttachmentUploadURLRequest) []dto.FieldError {
	var errs []dto.FieldError

	if strings.TrimSpace(input.FileName) == "" {
		errs = append(errs, dto.FieldError{Field: "fileName", Message: "fileName is required"})
	} else if utf8.RuneCountInString(strings.TrimSpace(input.FileName)) > 120 {
		errs = append(errs, dto.FieldError{Field: "fileName", Message: "fileName must be at most 120 characters"})
	}

	if strings.TrimSpace(input.ContentType) == "" {
		errs = append(errs, dto.FieldError{Field: "contentType", Message: "contentType is required"})
	}

	if input.SizeBytes <= 0 {
		errs = append(errs, dto.FieldError{Field: "sizeBytes", Message: "sizeBytes must be greater than 0"})
	}

	return errs
}

func (v *Validator) ValidateSaveAttachmentRequest(input dto.SaveAttachmentRequest) []dto.FieldError {
	var errs []dto.FieldError

	if strings.TrimSpace(input.AttachmentID) == "" {
		errs = append(errs, dto.FieldError{Field: "attachmentId", Message: "attachmentId is required"})
	}

	if strings.TrimSpace(input.ObjectKey) == "" {
		errs = append(errs, dto.FieldError{Field: "objectKey", Message: "objectKey is required"})
	} else if strings.Contains(strings.TrimSpace(input.ObjectKey), "..") || strings.Contains(strings.TrimSpace(input.ObjectKey), "\\") || strings.HasPrefix(strings.TrimSpace(input.ObjectKey), "/") {
		errs = append(errs, dto.FieldError{Field: "objectKey", Message: "objectKey must be a normalized storage key"})
	}

	if strings.TrimSpace(input.FileName) == "" {
		errs = append(errs, dto.FieldError{Field: "fileName", Message: "fileName is required"})
	} else if utf8.RuneCountInString(strings.TrimSpace(input.FileName)) > 120 {
		errs = append(errs, dto.FieldError{Field: "fileName", Message: "fileName must be at most 120 characters"})
	}

	return errs
}

func (v *Validator) ValidateListTicketsQuery(input dto.ListTicketsQuery) []dto.FieldError {
	var errs []dto.FieldError

	if input.Status != "" && !isValidStatus(input.Status) {
		errs = append(errs, dto.FieldError{Field: "status", Message: "status must be one of: open, in_progress, resolved"})
	}

	if input.Priority != "" && !isValidPriority(input.Priority) {
		errs = append(errs, dto.FieldError{Field: "priority", Message: "priority must be one of: low, medium, high"})
	}

	if input.Category != "" && !isValidCategory(input.Category) {
		errs = append(errs, dto.FieldError{Field: "category", Message: "category must be one of: account_access, network, hardware, application_bug, service_request, other"})
	}

	if input.Team != "" && !isValidTeam(input.Team) {
		errs = append(errs, dto.FieldError{Field: "team", Message: "team must be one of: helpdesk, infrastructure, applications, operations"})
	}

	switch input.SortBy {
	case "", "created_at", "updated_at", "priority", "status":
	default:
		errs = append(errs, dto.FieldError{Field: "sort_by", Message: "sort_by must be one of: created_at, updated_at, priority, status"})
	}

	switch input.SortOrder {
	case "", "asc", "desc":
	default:
		errs = append(errs, dto.FieldError{Field: "sort_order", Message: "sort_order must be one of: asc, desc"})
	}

	if input.Page < 1 {
		errs = append(errs, dto.FieldError{Field: "page", Message: "page must be at least 1"})
	}

	if input.PageSize < 1 || input.PageSize > 100 {
		errs = append(errs, dto.FieldError{Field: "page_size", Message: "page_size must be between 1 and 100"})
	}

	return errs
}

func (v *Validator) ValidateUpdateProfileRequest(input dto.UpdateProfileRequest) []dto.FieldError {
	var errs []dto.FieldError

	displayName := strings.TrimSpace(input.DisplayName)
	if displayName == "" {
		errs = append(errs, dto.FieldError{Field: "displayName", Message: "displayName is required"})
	} else if len([]rune(displayName)) > 80 {
		errs = append(errs, dto.FieldError{Field: "displayName", Message: "displayName must be at most 80 characters"})
	}

	avatarURL := strings.TrimSpace(input.AvatarURL)
	if strings.HasPrefix(avatarURL, "profiles/") && (strings.Contains(avatarURL, "..") || strings.Contains(avatarURL, "\\") || strings.HasPrefix(avatarURL, "/")) {
		errs = append(errs, dto.FieldError{Field: "avatarUrl", Message: "avatarUrl must be a normalized storage key"})
	}

	if avatarURL != "" && !strings.HasPrefix(avatarURL, "profiles/") {
		parsed, err := url.ParseRequestURI(avatarURL)
		if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
			errs = append(errs, dto.FieldError{Field: "avatarUrl", Message: "avatarUrl must be a valid http or https URL"})
		}
	}

	return errs
}

func (v *Validator) ValidateRequestProfileAvatarUploadURLRequest(input dto.RequestProfileAvatarUploadURLRequest) []dto.FieldError {
	var errs []dto.FieldError

	if strings.TrimSpace(input.FileName) == "" {
		errs = append(errs, dto.FieldError{Field: "fileName", Message: "fileName is required"})
	} else if utf8.RuneCountInString(strings.TrimSpace(input.FileName)) > 120 {
		errs = append(errs, dto.FieldError{Field: "fileName", Message: "fileName must be at most 120 characters"})
	}

	if strings.TrimSpace(input.ContentType) == "" {
		errs = append(errs, dto.FieldError{Field: "contentType", Message: "contentType is required"})
	}

	if input.SizeBytes <= 0 {
		errs = append(errs, dto.FieldError{Field: "sizeBytes", Message: "sizeBytes must be greater than 0"})
	}

	return errs
}

func isValidPriority(value string) bool {
	switch domain.TicketPriority(value) {
	case domain.TicketPriorityLow, domain.TicketPriorityMedium, domain.TicketPriorityHigh:
		return true
	default:
		return false
	}
}

func isValidStatus(value string) bool {
	switch domain.TicketStatus(value) {
	case domain.TicketStatusOpen, domain.TicketStatusInProgress, domain.TicketStatusResolved:
		return true
	default:
		return false
	}
}

func isValidCategory(value string) bool {
	switch domain.TicketCategory(value) {
	case domain.TicketCategoryAccountAccess, domain.TicketCategoryNetwork, domain.TicketCategoryHardware, domain.TicketCategoryApplicationBug, domain.TicketCategoryServiceRequest, domain.TicketCategoryOther:
		return true
	default:
		return false
	}
}

func isValidTeam(value string) bool {
	switch domain.TicketTeam(value) {
	case domain.TicketTeamHelpdesk, domain.TicketTeamInfrastructure, domain.TicketTeamApplications, domain.TicketTeamOperations:
		return true
	default:
		return false
	}
}

func isValidCommentVisibility(value string) bool {
	switch domain.CommentVisibility(value) {
	case domain.CommentVisibilityPublic, domain.CommentVisibilityInternal:
		return true
	default:
		return false
	}
}
