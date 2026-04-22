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

type TicketCategory string

const (
	TicketCategoryAccountAccess  TicketCategory = "account_access"
	TicketCategoryNetwork        TicketCategory = "network"
	TicketCategoryHardware       TicketCategory = "hardware"
	TicketCategoryApplicationBug TicketCategory = "application_bug"
	TicketCategoryServiceRequest TicketCategory = "service_request"
	TicketCategoryOther          TicketCategory = "other"
)

type TicketTeam string

const (
	TicketTeamHelpdesk      TicketTeam = "helpdesk"
	TicketTeamInfrastructure TicketTeam = "infrastructure"
	TicketTeamApplications   TicketTeam = "applications"
	TicketTeamOperations     TicketTeam = "operations"
)

type CommentVisibility string

const (
	CommentVisibilityPublic   CommentVisibility = "public"
	CommentVisibilityInternal CommentVisibility = "internal"
)

type Ticket struct {
	ID             string
	Title          string
	Description    string
	Status         TicketStatus
	Priority       TicketPriority
	Category       TicketCategory
	Team           TicketTeam
	CreatedBy      string
	CreatedByName  string
	CreatedByEmail string
	ReporterID     string
	ReporterName   string
	ReporterEmail  string
	AssigneeID     string
	AssigneeName   string
	AssignedAt     time.Time
	Comments       []Comment
	Attachments    []Attachment
	Activities     []ActivityEntry
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type Comment struct {
	ID         string
	TicketID   string
	Message    string
	AuthorName string
	AuthorRole string
	Visibility CommentVisibility
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type Attachment struct {
	ID             string
	TicketID       string
	FileName       string
	ContentType    string
	SizeBytes      int64
	ObjectKey      string
	UploadedByID   string
	UploadedByName string
	UploadedByRole string
	CreatedAt      time.Time
}

type TicketActivityAction string

const (
	TicketActivityCreated           TicketActivityAction = "ticket_created"
	TicketActivityStatusChanged     TicketActivityAction = "status_changed"
	TicketActivityCommentAdded      TicketActivityAction = "comment_added"
	TicketActivityAssignmentChanged TicketActivityAction = "assignment_changed"
	TicketActivityAttachmentAdded   TicketActivityAction = "attachment_added"
)

type ActivityEntry struct {
	ID        string
	TicketID  string
	ActorID   string
	ActorName string
	ActorRole string
	Action    TicketActivityAction
	Summary   string
	Metadata  map[string]string
	Timestamp time.Time
}

func UTCNow() time.Time {
	return time.Now().UTC().Truncate(time.Second)
}

func FormatTimestamp(value time.Time) string {
	return value.UTC().Format(time.RFC3339)
}
