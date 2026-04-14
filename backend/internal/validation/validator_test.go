package validation

import (
	"testing"

	"opsdesk/backend/internal/dto"
)

func TestValidateCreateTicketRequestRequiresFields(t *testing.T) {
	t.Parallel()

	validator := New()

	errs := validator.ValidateCreateTicketRequest(dto.CreateTicketRequest{})
	if len(errs) != 5 {
		t.Fatalf("expected 5 validation errors, got %d", len(errs))
	}
}

func TestValidateCreateTicketRequestPassesForValidPayload(t *testing.T) {
	t.Parallel()

	validator := New()

	errs := validator.ValidateCreateTicketRequest(dto.CreateTicketRequest{
		Title:         "Ticket title",
		Description:   "Ticket description",
		Priority:      "medium",
		ReporterName:  "OpsDesk User",
		ReporterEmail: "user@example.com",
	})
	if len(errs) != 0 {
		t.Fatalf("expected no validation errors, got %d", len(errs))
	}
}

func TestValidateUpdateTicketStatusRequestRejectsInvalidStatus(t *testing.T) {
	t.Parallel()

	validator := New()

	errs := validator.ValidateUpdateTicketStatusRequest(dto.UpdateTicketStatusRequest{
		Status: "closed",
	})
	if len(errs) != 1 {
		t.Fatalf("expected 1 validation error, got %d", len(errs))
	}

	if errs[0].Field != "status" {
		t.Fatalf("expected status field error, got %q", errs[0].Field)
	}
}

func TestValidateUpdateTicketStatusRequestPassesForAllowedStatus(t *testing.T) {
	t.Parallel()

	validator := New()

	errs := validator.ValidateUpdateTicketStatusRequest(dto.UpdateTicketStatusRequest{
		Status: "resolved",
	})
	if len(errs) != 0 {
		t.Fatalf("expected no validation errors, got %d", len(errs))
	}
}

func TestValidateAddCommentRequestRequiresFields(t *testing.T) {
	t.Parallel()

	validator := New()

	errs := validator.ValidateAddCommentRequest(dto.AddCommentRequest{})
	if len(errs) != 2 {
		t.Fatalf("expected 2 validation errors, got %d", len(errs))
	}
}

func TestValidateAddCommentRequestPassesForValidPayload(t *testing.T) {
	t.Parallel()

	validator := New()

	errs := validator.ValidateAddCommentRequest(dto.AddCommentRequest{
		Message:    "Issue acknowledged",
		AuthorName: "Support Agent",
	})
	if len(errs) != 0 {
		t.Fatalf("expected no validation errors, got %d", len(errs))
	}
}
