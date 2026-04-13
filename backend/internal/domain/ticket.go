package domain

import "time"

type TicketStatus string

const (
	TicketStatusOpen       TicketStatus = "open"
	TicketStatusInProgress TicketStatus = "in_progress"
	TicketStatusResolved   TicketStatus = "resolved"
)

type TicketPriority string

const (
	TicketPriorityLow    TicketPriority = "low"
	TicketPriorityMedium TicketPriority = "medium"
	TicketPriorityHigh   TicketPriority = "high"
)

type Ticket struct {
	ID            string
	Title         string
	Description   string
	Status        TicketStatus
	Priority      TicketPriority
	ReporterName  string
	ReporterEmail string
	Comments      []Comment
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type Comment struct {
	ID         string
	TicketID   string
	Message    string
	AuthorName string
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

func UTCNow() time.Time {
	return time.Now().UTC().Truncate(time.Second)
}

func FormatTimestamp(value time.Time) string {
	return value.UTC().Format(time.RFC3339)
}
