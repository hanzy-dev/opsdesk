package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"

	"opsdesk/backend/internal/domain"
	"opsdesk/backend/internal/repository"
)

var ErrNotImplemented = errors.New("not implemented")
var ErrTicketNotFound = errors.New("ticket not found")

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

type ticketService struct {
	repo      repository.TicketRepository
	idFactory *ticketIDFactory
}

func NewTicketService(repo repository.TicketRepository) TicketService {
	return &ticketService{
		repo:      repo,
		idFactory: &ticketIDFactory{},
	}
}

func (s *ticketService) CreateTicket(ctx context.Context, input CreateTicketInput) (domain.Ticket, error) {
	now := domain.UTCNow()
	ticket := domain.Ticket{
		ID:            s.idFactory.Next(),
		Title:         strings.TrimSpace(input.Title),
		Description:   strings.TrimSpace(input.Description),
		Status:        domain.TicketStatusOpen,
		Priority:      input.Priority,
		ReporterName:  strings.TrimSpace(input.ReporterName),
		ReporterEmail: strings.TrimSpace(input.ReporterEmail),
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := s.repo.CreateTicket(ctx, ticket); err != nil {
		return domain.Ticket{}, err
	}

	return ticket, nil
}

func (s *ticketService) ListTickets(ctx context.Context, input ListTicketsInput) ([]domain.Ticket, error) {
	return s.repo.ListTickets(ctx, repository.ListTicketsFilter{
		Status:   input.Status,
		Priority: input.Priority,
	})
}

func (s *ticketService) GetTicket(ctx context.Context, ticketID string) (domain.Ticket, error) {
	ticket, err := s.repo.GetTicketByID(ctx, ticketID)
	if err != nil {
		if errors.Is(err, repository.ErrTicketNotFound) {
			return domain.Ticket{}, ErrTicketNotFound
		}

		return domain.Ticket{}, err
	}

	return ticket, nil
}

func (s *ticketService) UpdateTicketStatus(context.Context, string, UpdateTicketStatusInput) (domain.Ticket, error) {
	return domain.Ticket{}, ErrNotImplemented
}

func (s *ticketService) AddComment(context.Context, string, AddCommentInput) (domain.Comment, error) {
	return domain.Comment{}, ErrNotImplemented
}

type ticketIDFactory struct {
	mu      sync.Mutex
	counter uint64
}

func (f *ticketIDFactory) Next() string {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.counter++
	return fmt.Sprintf("TCK-%04d", f.counter)
}
