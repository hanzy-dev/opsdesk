package repository

import (
	"context"
	"errors"

	"opsdesk/backend/internal/domain"
)

var ErrTicketNotFound = errors.New("ticket not found")

type ListTicketsFilter struct {
	Query          string
	Status         domain.TicketStatus
	Priority       domain.TicketPriority
	Category       domain.TicketCategory
	Team           domain.TicketTeam
	ReporterEmail  string
	AssigneeID     string
	UnassignedOnly bool
	Page           int
	PageSize       int
	SortBy         string
	SortOrder      string
}

type ListTicketsResult struct {
	Items      []domain.Ticket
	TotalItems int
	Page       int
	PageSize   int
}

type TicketRepository interface {
	CreateTicket(ctx context.Context, ticket domain.Ticket) error
	UpdateTicket(ctx context.Context, ticket domain.Ticket) error
	ListTickets(ctx context.Context, filter ListTicketsFilter) (ListTicketsResult, error)
	GetTicketByID(ctx context.Context, ticketID string) (domain.Ticket, error)
}
