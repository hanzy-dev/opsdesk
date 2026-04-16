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
	Title          string
	Description    string
	Priority       domain.TicketPriority
	CreatedBy      string
	CreatedByName  string
	CreatedByEmail string
	ReporterID     string
	ReporterName   string
	ReporterEmail  string
}

type ListTicketsInput struct {
	Status        domain.TicketStatus
	Priority      domain.TicketPriority
	ReporterEmail string
	AssigneeID    string
}

type UpdateTicketStatusInput struct {
	Status domain.TicketStatus
}

type AddCommentInput struct {
	Message    string
	AuthorName string
}

type AssignTicketInput struct {
	AssigneeID   string
	AssigneeName string
}

type TicketService interface {
	CreateTicket(ctx context.Context, input CreateTicketInput) (domain.Ticket, error)
	ListTickets(ctx context.Context, input ListTicketsInput) ([]domain.Ticket, error)
	GetTicket(ctx context.Context, ticketID string) (domain.Ticket, error)
	UpdateTicketStatus(ctx context.Context, ticketID string, input UpdateTicketStatusInput) (domain.Ticket, error)
	AddComment(ctx context.Context, ticketID string, input AddCommentInput) (domain.Comment, error)
	AssignTicket(ctx context.Context, ticketID string, input AssignTicketInput) (domain.Ticket, error)
}

type ticketService struct {
	repo             repository.TicketRepository
	ticketIDFactory  *idFactory
	commentIDFactory *idFactory
}

func NewTicketService(repo repository.TicketRepository) TicketService {
	return &ticketService{
		repo:             repo,
		ticketIDFactory:  newIDFactory("TCK"),
		commentIDFactory: newIDFactory("CMT"),
	}
}

func (s *ticketService) CreateTicket(ctx context.Context, input CreateTicketInput) (domain.Ticket, error) {
	now := domain.UTCNow()
	ticket := domain.Ticket{
		ID:             s.ticketIDFactory.Next(),
		Title:          strings.TrimSpace(input.Title),
		Description:    strings.TrimSpace(input.Description),
		Status:         domain.TicketStatusOpen,
		Priority:       input.Priority,
		CreatedBy:      strings.TrimSpace(input.CreatedBy),
		CreatedByName:  strings.TrimSpace(input.CreatedByName),
		CreatedByEmail: strings.TrimSpace(input.CreatedByEmail),
		ReporterID:     strings.TrimSpace(input.ReporterID),
		ReporterName:   strings.TrimSpace(input.ReporterName),
		ReporterEmail:  strings.TrimSpace(input.ReporterEmail),
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.repo.CreateTicket(ctx, ticket); err != nil {
		return domain.Ticket{}, err
	}

	return ticket, nil
}

func (s *ticketService) ListTickets(ctx context.Context, input ListTicketsInput) ([]domain.Ticket, error) {
	return s.repo.ListTickets(ctx, repository.ListTicketsFilter{
		Status:        input.Status,
		Priority:      input.Priority,
		ReporterEmail: strings.TrimSpace(input.ReporterEmail),
		AssigneeID:    strings.TrimSpace(input.AssigneeID),
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

func (s *ticketService) UpdateTicketStatus(ctx context.Context, ticketID string, input UpdateTicketStatusInput) (domain.Ticket, error) {
	ticket, err := s.repo.GetTicketByID(ctx, ticketID)
	if err != nil {
		if errors.Is(err, repository.ErrTicketNotFound) {
			return domain.Ticket{}, ErrTicketNotFound
		}

		return domain.Ticket{}, err
	}

	ticket.Status = input.Status
	ticket.UpdatedAt = domain.UTCNow()

	if err := s.repo.UpdateTicket(ctx, ticket); err != nil {
		if errors.Is(err, repository.ErrTicketNotFound) {
			return domain.Ticket{}, ErrTicketNotFound
		}

		return domain.Ticket{}, err
	}

	return ticket, nil
}

func (s *ticketService) AddComment(ctx context.Context, ticketID string, input AddCommentInput) (domain.Comment, error) {
	ticket, err := s.repo.GetTicketByID(ctx, ticketID)
	if err != nil {
		if errors.Is(err, repository.ErrTicketNotFound) {
			return domain.Comment{}, ErrTicketNotFound
		}

		return domain.Comment{}, err
	}

	now := domain.UTCNow()
	comment := domain.Comment{
		ID:         s.commentIDFactory.Next(),
		TicketID:   ticketID,
		Message:    strings.TrimSpace(input.Message),
		AuthorName: strings.TrimSpace(input.AuthorName),
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	ticket.Comments = append(ticket.Comments, comment)
	ticket.UpdatedAt = now

	if err := s.repo.UpdateTicket(ctx, ticket); err != nil {
		if errors.Is(err, repository.ErrTicketNotFound) {
			return domain.Comment{}, ErrTicketNotFound
		}

		return domain.Comment{}, err
	}

	return comment, nil
}

func (s *ticketService) AssignTicket(ctx context.Context, ticketID string, input AssignTicketInput) (domain.Ticket, error) {
	ticket, err := s.repo.GetTicketByID(ctx, ticketID)
	if err != nil {
		if errors.Is(err, repository.ErrTicketNotFound) {
			return domain.Ticket{}, ErrTicketNotFound
		}

		return domain.Ticket{}, err
	}

	now := domain.UTCNow()
	ticket.AssigneeID = strings.TrimSpace(input.AssigneeID)
	ticket.AssigneeName = strings.TrimSpace(input.AssigneeName)
	ticket.AssignedAt = now
	ticket.UpdatedAt = now

	if err := s.repo.UpdateTicket(ctx, ticket); err != nil {
		if errors.Is(err, repository.ErrTicketNotFound) {
			return domain.Ticket{}, ErrTicketNotFound
		}

		return domain.Ticket{}, err
	}

	return ticket, nil
}

type idFactory struct {
	mu      sync.Mutex
	prefix  string
	counter uint64
}

func newIDFactory(prefix string) *idFactory {
	return &idFactory{prefix: prefix}
}

func (f *idFactory) Next() string {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.counter++
	return fmt.Sprintf("%s-%04d", f.prefix, f.counter)
}
