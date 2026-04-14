package repository

import (
	"context"
	"errors"

	"opsdesk/backend/internal/domain"
)

var ErrTicketNotFound = errors.New("ticket not found")

type ListTicketsFilter struct {
	Status   domain.TicketStatus
	Priority domain.TicketPriority
}

type TicketRepository interface {
	CreateTicket(ctx context.Context, ticket domain.Ticket) error
	UpdateTicket(ctx context.Context, ticket domain.Ticket) error
	ListTickets(ctx context.Context, filter ListTicketsFilter) ([]domain.Ticket, error)
	GetTicketByID(ctx context.Context, ticketID string) (domain.Ticket, error)
}
