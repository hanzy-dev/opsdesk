package service

import (
	"context"
	"errors"

	"opsdesk/backend/internal/domain"
)

var ErrNotImplemented = errors.New("not implemented")

type CreateTicketInput struct {
	Title         string
	Description   string
	Priority      domain.TicketPriority
	ReporterName  string
	ReporterEmail string
}

type ListTicketsInput struct {
	Status   domain.TicketStatus
	Priority domain.TicketPriority
}

type UpdateTicketStatusInput struct {
	Status domain.TicketStatus
}

type AddCommentInput struct {
	Message    string
	AuthorName string
}

type TicketService interface {
	CreateTicket(ctx context.Context, input CreateTicketInput) (domain.Ticket, error)
	ListTickets(ctx context.Context, input ListTicketsInput) ([]domain.Ticket, error)
	GetTicket(ctx context.Context, ticketID string) (domain.Ticket, error)
	UpdateTicketStatus(ctx context.Context, ticketID string, input UpdateTicketStatusInput) (domain.Ticket, error)
	AddComment(ctx context.Context, ticketID string, input AddCommentInput) (domain.Comment, error)
}

type StubTicketService struct{}

func NewStubTicketService() *StubTicketService {
	return &StubTicketService{}
}

func (s *StubTicketService) CreateTicket(context.Context, CreateTicketInput) (domain.Ticket, error) {
	return domain.Ticket{}, ErrNotImplemented
}

func (s *StubTicketService) ListTickets(context.Context, ListTicketsInput) ([]domain.Ticket, error) {
	return nil, ErrNotImplemented
}

func (s *StubTicketService) GetTicket(context.Context, string) (domain.Ticket, error) {
	return domain.Ticket{}, ErrNotImplemented
}

func (s *StubTicketService) UpdateTicketStatus(context.Context, string, UpdateTicketStatusInput) (domain.Ticket, error) {
	return domain.Ticket{}, ErrNotImplemented
}

func (s *StubTicketService) AddComment(context.Context, string, AddCommentInput) (domain.Comment, error) {
	return domain.Comment{}, ErrNotImplemented
}
