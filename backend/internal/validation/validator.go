package validation

import (
	"strings"

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
