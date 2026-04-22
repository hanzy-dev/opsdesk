package memory

import (
	"context"
	"sort"
	"strings"
	"sync"

	"opsdesk/backend/internal/domain"
	"opsdesk/backend/internal/repository"
)

type TicketRepository struct {
	mu      sync.RWMutex
	tickets map[string]domain.Ticket
}

func NewTicketRepository() *TicketRepository {
	return &TicketRepository{
		tickets: make(map[string]domain.Ticket),
	}
}

func (r *TicketRepository) CreateTicket(_ context.Context, ticket domain.Ticket) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.tickets[ticket.ID] = cloneTicket(ticket)
	return nil
}

func (r *TicketRepository) UpdateTicket(_ context.Context, ticket domain.Ticket) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.tickets[ticket.ID]; !ok {
		return repository.ErrTicketNotFound
	}

	r.tickets[ticket.ID] = cloneTicket(ticket)
	return nil
}

func (r *TicketRepository) ListTickets(_ context.Context, filter repository.ListTicketsFilter) (repository.ListTicketsResult, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	tickets := make([]domain.Ticket, 0, len(r.tickets))
	for _, ticket := range r.tickets {
		if filter.Status != "" && ticket.Status != filter.Status {
			continue
		}

		if filter.Priority != "" && ticket.Priority != filter.Priority {
			continue
		}

		if filter.Category != "" && ticket.Category != filter.Category {
			continue
		}

		if filter.Team != "" && ticket.Team != filter.Team {
			continue
		}

		if strings.TrimSpace(filter.ReporterEmail) != "" && !strings.EqualFold(ticket.ReporterEmail, strings.TrimSpace(filter.ReporterEmail)) {
			continue
		}

		if strings.TrimSpace(filter.AssigneeID) != "" && !strings.EqualFold(ticket.AssigneeID, strings.TrimSpace(filter.AssigneeID)) {
			continue
		}

		if filter.UnassignedOnly && strings.TrimSpace(ticket.AssigneeID) != "" {
			continue
		}

		if !matchesMemorySearchQuery(ticket, filter.Query) {
			continue
		}

		tickets = append(tickets, cloneTicket(ticket))
	}

	sortMemoryTickets(tickets, filter.SortBy, filter.SortOrder)

	totalItems := len(tickets)
	page := normalizePositiveInt(filter.Page, 1)
	pageSize := normalizePositiveInt(filter.PageSize, 10)
	start := (page - 1) * pageSize
	if start >= totalItems {
		return repository.ListTicketsResult{
			Items:      []domain.Ticket{},
			TotalItems: totalItems,
			Page:       page,
			PageSize:   pageSize,
		}, nil
	}

	end := start + pageSize
	if end > totalItems {
		end = totalItems
	}

	return repository.ListTicketsResult{
		Items:      tickets[start:end],
		TotalItems: totalItems,
		Page:       page,
		PageSize:   pageSize,
	}, nil
}

func (r *TicketRepository) GetTicketByID(_ context.Context, ticketID string) (domain.Ticket, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	ticket, ok := r.tickets[ticketID]
	if !ok {
		return domain.Ticket{}, repository.ErrTicketNotFound
	}

	return cloneTicket(ticket), nil
}

func cloneTicket(ticket domain.Ticket) domain.Ticket {
	cloned := ticket
	if ticket.Comments != nil {
		cloned.Comments = append([]domain.Comment(nil), ticket.Comments...)
	}
	if ticket.Attachments != nil {
		cloned.Attachments = append([]domain.Attachment(nil), ticket.Attachments...)
	}
	if ticket.Activities != nil {
		cloned.Activities = append([]domain.ActivityEntry(nil), ticket.Activities...)
		for index, activity := range cloned.Activities {
			if activity.Metadata == nil {
				continue
			}

			metadata := make(map[string]string, len(activity.Metadata))
			for key, value := range activity.Metadata {
				metadata[key] = value
			}

			cloned.Activities[index].Metadata = metadata
		}
	}

	return cloned
}

func matchesMemorySearchQuery(ticket domain.Ticket, query string) bool {
	normalizedQuery := strings.TrimSpace(strings.ToLower(query))
	if normalizedQuery == "" {
		return true
	}

	return strings.Contains(strings.ToLower(strings.Join([]string{
		ticket.ID,
		ticket.Title,
		ticket.Description,
		string(ticket.Category),
		string(ticket.Team),
		ticket.ReporterName,
		ticket.ReporterEmail,
		ticket.AssigneeName,
	}, " ")), normalizedQuery)
}

func sortMemoryTickets(tickets []domain.Ticket, sortBy, sortOrder string) {
	normalizedSortBy := strings.TrimSpace(strings.ToLower(sortBy))
	if normalizedSortBy == "" {
		normalizedSortBy = "updated_at"
	}

	descending := !strings.EqualFold(strings.TrimSpace(sortOrder), "asc")

	sort.Slice(tickets, func(i, j int) bool {
		left := tickets[i]
		right := tickets[j]

		switch normalizedSortBy {
		case "created_at":
			if descending {
				return left.CreatedAt.After(right.CreatedAt)
			}
			return left.CreatedAt.Before(right.CreatedAt)
		case "priority":
			leftRank := priorityRank(left.Priority)
			rightRank := priorityRank(right.Priority)
			if leftRank == rightRank {
				if descending {
					return left.UpdatedAt.After(right.UpdatedAt)
				}
				return left.UpdatedAt.Before(right.UpdatedAt)
			}
			if descending {
				return leftRank > rightRank
			}
			return leftRank < rightRank
		case "status":
			leftRank := statusRank(left.Status)
			rightRank := statusRank(right.Status)
			if leftRank == rightRank {
				if descending {
					return left.UpdatedAt.After(right.UpdatedAt)
				}
				return left.UpdatedAt.Before(right.UpdatedAt)
			}
			if descending {
				return leftRank > rightRank
			}
			return leftRank < rightRank
		default:
			if descending {
				return left.UpdatedAt.After(right.UpdatedAt)
			}
			return left.UpdatedAt.Before(right.UpdatedAt)
		}
	})
}

func priorityRank(priority domain.TicketPriority) int {
	switch priority {
	case domain.TicketPriorityHigh:
		return 3
	case domain.TicketPriorityMedium:
		return 2
	default:
		return 1
	}
}

func statusRank(status domain.TicketStatus) int {
	switch status {
	case domain.TicketStatusOpen:
		return 3
	case domain.TicketStatusInProgress:
		return 2
	default:
		return 1
	}
}

func normalizePositiveInt(value, fallback int) int {
	if value <= 0 {
		return fallback
	}

	return value
}
