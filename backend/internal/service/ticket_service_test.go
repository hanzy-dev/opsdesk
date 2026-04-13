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
