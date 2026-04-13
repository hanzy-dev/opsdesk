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
