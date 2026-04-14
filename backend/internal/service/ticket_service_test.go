package service

import (
	"context"
	"testing"
	"time"

	"opsdesk/backend/internal/domain"
	"opsdesk/backend/internal/repository/memory"
)

func TestCreateTicketSetsDefaultsAndUTCFields(t *testing.T) {
	t.Parallel()

	svc := NewTicketService(memory.NewTicketRepository())

	ticket, err := svc.CreateTicket(context.Background(), CreateTicketInput{
		Title:         "API gateway timeout",
		Description:   "Investigate repeated timeout errors",
		Priority:      domain.TicketPriorityHigh,
		ReporterName:  "Cloud Lab",
		ReporterEmail: "lab@example.com",
	})
	if err != nil {
		t.Fatalf("CreateTicket() error = %v", err)
	}

	if ticket.ID == "" {
		t.Fatal("expected generated ticket ID")
	}

	if ticket.Status != domain.TicketStatusOpen {
		t.Fatalf("expected default status open, got %q", ticket.Status)
	}

	if ticket.CreatedAt.IsZero() || ticket.UpdatedAt.IsZero() {
		t.Fatal("expected createdAt and updatedAt to be set")
	}

	if ticket.CreatedAt.Location() != time.UTC || ticket.UpdatedAt.Location() != time.UTC {
		t.Fatal("expected timestamps to be stored in UTC")
	}
}

func TestListTicketsReturnsNewestFirst(t *testing.T) {
	t.Parallel()

	svc := NewTicketService(memory.NewTicketRepository())

	first, err := svc.CreateTicket(context.Background(), CreateTicketInput{
		Title:         "First ticket",
		Description:   "First description",
		Priority:      domain.TicketPriorityLow,
		ReporterName:  "User One",
		ReporterEmail: "one@example.com",
	})
	if err != nil {
		t.Fatalf("CreateTicket() first error = %v", err)
	}

	time.Sleep(1100 * time.Millisecond)

	second, err := svc.CreateTicket(context.Background(), CreateTicketInput{
		Title:         "Second ticket",
		Description:   "Second description",
		Priority:      domain.TicketPriorityHigh,
		ReporterName:  "User Two",
		ReporterEmail: "two@example.com",
	})
	if err != nil {
		t.Fatalf("CreateTicket() second error = %v", err)
	}

	tickets, err := svc.ListTickets(context.Background(), ListTicketsInput{})
	if err != nil {
		t.Fatalf("ListTickets() error = %v", err)
	}

	if len(tickets) != 2 {
		t.Fatalf("expected 2 tickets, got %d", len(tickets))
	}

	if tickets[0].ID != second.ID {
		t.Fatalf("expected newest ticket first, got %q", tickets[0].ID)
	}

	if tickets[1].ID != first.ID {
		t.Fatalf("expected oldest ticket second, got %q", tickets[1].ID)
	}
}

func TestGetTicketReturnsNotFound(t *testing.T) {
	t.Parallel()

	svc := NewTicketService(memory.NewTicketRepository())

	_, err := svc.GetTicket(context.Background(), "TCK-9999")
	if err == nil {
		t.Fatal("expected not found error")
	}

	if err != ErrTicketNotFound {
		t.Fatalf("expected ErrTicketNotFound, got %v", err)
	}
}

func TestUpdateTicketStatusUpdatesStatusAndTimestamp(t *testing.T) {
	t.Parallel()

	svc := NewTicketService(memory.NewTicketRepository())

	ticket, err := svc.CreateTicket(context.Background(), CreateTicketInput{
		Title:         "Worker error",
		Description:   "Queue worker keeps retrying",
		Priority:      domain.TicketPriorityMedium,
		ReporterName:  "Ops Team",
		ReporterEmail: "ops@example.com",
	})
	if err != nil {
		t.Fatalf("CreateTicket() error = %v", err)
	}

	time.Sleep(1100 * time.Millisecond)

	updated, err := svc.UpdateTicketStatus(context.Background(), ticket.ID, UpdateTicketStatusInput{
		Status: domain.TicketStatusInProgress,
	})
	if err != nil {
		t.Fatalf("UpdateTicketStatus() error = %v", err)
	}

	if updated.Status != domain.TicketStatusInProgress {
		t.Fatalf("expected status %q, got %q", domain.TicketStatusInProgress, updated.Status)
	}

	if !updated.UpdatedAt.After(ticket.UpdatedAt) {
		t.Fatal("expected updatedAt to change after status update")
	}

	if updated.UpdatedAt.Location() != time.UTC {
		t.Fatal("expected updatedAt to remain in UTC")
	}
}

func TestUpdateTicketStatusReturnsNotFound(t *testing.T) {
	t.Parallel()

	svc := NewTicketService(memory.NewTicketRepository())

	_, err := svc.UpdateTicketStatus(context.Background(), "TCK-9999", UpdateTicketStatusInput{
		Status: domain.TicketStatusResolved,
	})
	if err == nil {
		t.Fatal("expected not found error")
	}

	if err != ErrTicketNotFound {
		t.Fatalf("expected ErrTicketNotFound, got %v", err)
	}
}

func TestAddCommentAppendsCommentAndUpdatesTicketTimestamp(t *testing.T) {
	t.Parallel()

	svc := NewTicketService(memory.NewTicketRepository())

	ticket, err := svc.CreateTicket(context.Background(), CreateTicketInput{
		Title:         "API error spike",
		Description:   "Several 5xx responses observed",
		Priority:      domain.TicketPriorityHigh,
		ReporterName:  "NOC",
		ReporterEmail: "noc@example.com",
	})
	if err != nil {
		t.Fatalf("CreateTicket() error = %v", err)
	}

	time.Sleep(1100 * time.Millisecond)

	comment, err := svc.AddComment(context.Background(), ticket.ID, AddCommentInput{
		Message:    "Investigation has started",
		AuthorName: "On-call Engineer",
	})
	if err != nil {
		t.Fatalf("AddComment() error = %v", err)
	}

	if comment.ID == "" {
		t.Fatal("expected generated comment ID")
	}

	if comment.TicketID != ticket.ID {
		t.Fatalf("expected comment ticket ID %q, got %q", ticket.ID, comment.TicketID)
	}

	if comment.CreatedAt.Location() != time.UTC || comment.UpdatedAt.Location() != time.UTC {
		t.Fatal("expected comment timestamps to be stored in UTC")
	}

	stored, err := svc.GetTicket(context.Background(), ticket.ID)
	if err != nil {
		t.Fatalf("GetTicket() error = %v", err)
	}

	if len(stored.Comments) != 1 {
		t.Fatalf("expected 1 comment, got %d", len(stored.Comments))
	}

	if stored.Comments[0].Message != "Investigation has started" {
		t.Fatalf("expected stored comment message to match, got %q", stored.Comments[0].Message)
	}

	if !stored.UpdatedAt.After(ticket.UpdatedAt) {
		t.Fatal("expected ticket updatedAt to change after comment creation")
	}
}

func TestAddCommentReturnsNotFound(t *testing.T) {
	t.Parallel()

	svc := NewTicketService(memory.NewTicketRepository())

	_, err := svc.AddComment(context.Background(), "TCK-9999", AddCommentInput{
		Message:    "Following up",
		AuthorName: "Support",
	})
	if err == nil {
		t.Fatal("expected not found error")
	}

	if err != ErrTicketNotFound {
		t.Fatalf("expected ErrTicketNotFound, got %v", err)
	}
}
