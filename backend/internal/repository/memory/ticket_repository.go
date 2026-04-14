package memory

import (
	"context"
	"sort"
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

func (r *TicketRepository) ListTickets(_ context.Context, filter repository.ListTicketsFilter) ([]domain.Ticket, error) {
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

		tickets = append(tickets, cloneTicket(ticket))
	}

	sort.Slice(tickets, func(i, j int) bool {
		return tickets[i].CreatedAt.After(tickets[j].CreatedAt)
	})

	return tickets, nil
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

	return cloned
}
