package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"opsdesk/backend/internal/domain"
	"opsdesk/backend/internal/repository"
	"opsdesk/backend/internal/storage"
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
	CreatedByRole  string
	ReporterID     string
	ReporterName   string
	ReporterEmail  string
}

type ListTicketsInput struct {
	Query          string
	Status         domain.TicketStatus
	Priority       domain.TicketPriority
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
	Page       int
	PageSize   int
	TotalItems int
	TotalPages int
	HasNext    bool
}

type UpdateTicketStatusInput struct {
	Status    domain.TicketStatus
	ActorID   string
	ActorName string
	ActorRole string
}

type AddCommentInput struct {
	Message    string
	AuthorName string
	ActorID    string
	ActorName  string
	ActorRole  string
}

type AssignTicketInput struct {
	AssigneeID   string
	AssigneeName string
	ActorID      string
	ActorRole    string
}

type TicketService interface {
	CreateTicket(ctx context.Context, input CreateTicketInput) (domain.Ticket, error)
	ListTickets(ctx context.Context, input ListTicketsInput) (ListTicketsResult, error)
	GetTicket(ctx context.Context, ticketID string) (domain.Ticket, error)
	ListTicketActivities(ctx context.Context, ticketID string) ([]domain.ActivityEntry, error)
	CreateAttachmentUploadURL(ctx context.Context, ticketID string, input AttachmentUploadURLInput) (AttachmentUploadURLResult, error)
	SaveAttachment(ctx context.Context, ticketID string, input SaveAttachmentInput) (domain.Attachment, error)
	CreateAttachmentDownloadURL(ctx context.Context, ticketID string, attachmentID string) (AttachmentDownloadURLResult, error)
	UpdateTicketStatus(ctx context.Context, ticketID string, input UpdateTicketStatusInput) (domain.Ticket, error)
	AddComment(ctx context.Context, ticketID string, input AddCommentInput) (domain.Comment, error)
	AssignTicket(ctx context.Context, ticketID string, input AssignTicketInput) (domain.Ticket, error)
}

type ticketService struct {
	repo                repository.TicketRepository
	ticketIDFactory     *idFactory
	commentIDFactory    *idFactory
	attachmentIDFactory *idFactory
	activityIDFactory   *idFactory
	attachmentStorage   storage.AttachmentStorage
}

func NewTicketService(repo repository.TicketRepository, attachmentStorages ...storage.AttachmentStorage) TicketService {
	var attachmentStorage storage.AttachmentStorage
	if len(attachmentStorages) > 0 {
		attachmentStorage = attachmentStorages[0]
	}

	return &ticketService{
		repo:                repo,
		ticketIDFactory:     newIDFactory("TCK"),
		commentIDFactory:    newIDFactory("CMT"),
		attachmentIDFactory: newIDFactory("ATT"),
		activityIDFactory:   newIDFactory("ACT"),
		attachmentStorage:   attachmentStorage,
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
		Activities: []domain.ActivityEntry{
			s.newActivityEntry(
				"",
				strings.TrimSpace(input.CreatedBy),
				strings.TrimSpace(input.CreatedByName),
				strings.TrimSpace(input.CreatedByRole),
				domain.TicketActivityCreated,
				"Tiket dibuat",
				map[string]string{
					"priority": string(input.Priority),
					"status":   string(domain.TicketStatusOpen),
				},
				now,
			),
		},
		CreatedAt: now,
		UpdatedAt: now,
	}
	ticket.Activities[0].TicketID = ticket.ID

	if err := s.repo.CreateTicket(ctx, ticket); err != nil {
		return domain.Ticket{}, err
	}

	return ticket, nil
}

func (s *ticketService) ListTickets(ctx context.Context, input ListTicketsInput) (ListTicketsResult, error) {
	result, err := s.repo.ListTickets(ctx, repository.ListTicketsFilter{
		Query:          strings.TrimSpace(input.Query),
		Status:         input.Status,
		Priority:       input.Priority,
		ReporterEmail:  strings.TrimSpace(input.ReporterEmail),
		AssigneeID:     strings.TrimSpace(input.AssigneeID),
		UnassignedOnly: input.UnassignedOnly,
		Page:           input.Page,
		PageSize:       input.PageSize,
		SortBy:         strings.TrimSpace(input.SortBy),
		SortOrder:      strings.TrimSpace(input.SortOrder),
	})
	if err != nil {
		return ListTicketsResult{}, err
	}

	totalPages := 0
	if result.PageSize > 0 {
		totalPages = (result.TotalItems + result.PageSize - 1) / result.PageSize
	}

	return ListTicketsResult{
		Items:      result.Items,
		Page:       result.Page,
		PageSize:   result.PageSize,
		TotalItems: result.TotalItems,
		TotalPages: totalPages,
		HasNext:    result.Page < totalPages,
	}, nil
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

func (s *ticketService) ListTicketActivities(ctx context.Context, ticketID string) ([]domain.ActivityEntry, error) {
	ticket, err := s.repo.GetTicketByID(ctx, ticketID)
	if err != nil {
		if errors.Is(err, repository.ErrTicketNotFound) {
			return nil, ErrTicketNotFound
		}

		return nil, err
	}

	activities := append([]domain.ActivityEntry(nil), ticket.Activities...)
	return activities, nil
}

func (s *ticketService) UpdateTicketStatus(ctx context.Context, ticketID string, input UpdateTicketStatusInput) (domain.Ticket, error) {
	ticket, err := s.repo.GetTicketByID(ctx, ticketID)
	if err != nil {
		if errors.Is(err, repository.ErrTicketNotFound) {
			return domain.Ticket{}, ErrTicketNotFound
		}

		return domain.Ticket{}, err
	}

	previousStatus := ticket.Status
	ticket.Status = input.Status
	now := domain.UTCNow()
	ticket.UpdatedAt = now
	ticket.Activities = append(ticket.Activities, s.newActivityEntry(
		ticket.ID,
		strings.TrimSpace(input.ActorID),
		strings.TrimSpace(input.ActorName),
		strings.TrimSpace(input.ActorRole),
		domain.TicketActivityStatusChanged,
		"Status diubah",
		map[string]string{
			"beforeStatus": string(previousStatus),
			"afterStatus":  string(input.Status),
		},
		now,
	))

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
	ticket.Activities = append(ticket.Activities, s.newActivityEntry(
		ticket.ID,
		strings.TrimSpace(input.ActorID),
		strings.TrimSpace(input.ActorName),
		strings.TrimSpace(input.ActorRole),
		domain.TicketActivityCommentAdded,
		"Komentar ditambahkan",
		map[string]string{
			"commentId": comment.ID,
		},
		now,
	))

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
	previousAssigneeID := ticket.AssigneeID
	previousAssigneeName := ticket.AssigneeName
	ticket.AssigneeID = strings.TrimSpace(input.AssigneeID)
	ticket.AssigneeName = strings.TrimSpace(input.AssigneeName)
	ticket.AssignedAt = now
	ticket.UpdatedAt = now
	ticket.Activities = append(ticket.Activities, s.newActivityEntry(
		ticket.ID,
		strings.TrimSpace(input.ActorID),
		strings.TrimSpace(input.AssigneeName),
		strings.TrimSpace(input.ActorRole),
		domain.TicketActivityAssignmentChanged,
		"Tiket ditugaskan",
		map[string]string{
			"beforeAssigneeId":   strings.TrimSpace(previousAssigneeID),
			"beforeAssigneeName": strings.TrimSpace(previousAssigneeName),
			"afterAssigneeId":    strings.TrimSpace(input.AssigneeID),
			"afterAssigneeName":  strings.TrimSpace(input.AssigneeName),
		},
		now,
	))

	if err := s.repo.UpdateTicket(ctx, ticket); err != nil {
		if errors.Is(err, repository.ErrTicketNotFound) {
			return domain.Ticket{}, ErrTicketNotFound
		}

		return domain.Ticket{}, err
	}

	return ticket, nil
}

func (s *ticketService) newActivityEntry(
	ticketID string,
	actorID string,
	actorName string,
	actorRole string,
	action domain.TicketActivityAction,
	summary string,
	metadata map[string]string,
	timestamp time.Time,
) domain.ActivityEntry {
	return domain.ActivityEntry{
		ID:        s.activityIDFactory.Next(),
		TicketID:  ticketID,
		ActorID:   actorID,
		ActorName: actorName,
		ActorRole: actorRole,
		Action:    action,
		Summary:   summary,
		Metadata:  metadata,
		Timestamp: timestamp,
	}
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
