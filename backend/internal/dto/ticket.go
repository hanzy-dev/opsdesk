package dto

type CreateTicketRequest struct {
	Title         string `json:"title"`
	Description   string `json:"description"`
	Priority      string `json:"priority"`
	ReporterName  string `json:"reporterName"`
	ReporterEmail string `json:"reporterEmail"`
}

type ListTicketsQuery struct {
	Status   string
	Priority string
}

type UpdateTicketStatusRequest struct {
	Status string `json:"status"`
}

type AddCommentRequest struct {
	Message    string `json:"message"`
	AuthorName string `json:"authorName"`
}

type AssignTicketRequest struct {
	AssigneeID string `json:"assigneeId,omitempty"`
}

type TicketActivityResponse struct {
	ID        string            `json:"id"`
	TicketID  string            `json:"ticketId"`
	ActorID   string            `json:"actorId,omitempty"`
	ActorName string            `json:"actorName,omitempty"`
	ActorRole string            `json:"actorRole,omitempty"`
	Action    string            `json:"action"`
	Summary   string            `json:"summary"`
	Metadata  map[string]string `json:"metadata,omitempty"`
	Timestamp string            `json:"timestamp"`
}

type TicketResponse struct {
	ID             string            `json:"id"`
	Title          string            `json:"title"`
	Description    string            `json:"description"`
	Status         string            `json:"status"`
	Priority       string            `json:"priority"`
	CreatedBy      string            `json:"createdBy,omitempty"`
	CreatedByName  string            `json:"createdByName,omitempty"`
	CreatedByEmail string            `json:"createdByEmail,omitempty"`
	ReporterID     string            `json:"reporterId,omitempty"`
	ReporterName   string            `json:"reporterName"`
	ReporterEmail  string            `json:"reporterEmail"`
	AssigneeID     string            `json:"assigneeId,omitempty"`
	AssigneeName   string            `json:"assigneeName,omitempty"`
	AssignedAt     string            `json:"assignedAt,omitempty"`
	Comments       []CommentResponse `json:"comments,omitempty"`
	CreatedAt      string            `json:"createdAt"`
	UpdatedAt      string            `json:"updatedAt"`
}

type CommentResponse struct {
	ID         string `json:"id"`
	TicketID   string `json:"ticketId"`
	Message    string `json:"message"`
	AuthorName string `json:"authorName"`
	CreatedAt  string `json:"createdAt"`
	UpdatedAt  string `json:"updatedAt"`
}

type HealthResponse struct {
	Status string `json:"status"`
	Env    string `json:"env"`
}

type SuccessResponse[T any] struct {
	Data T `json:"data"`
}

type ErrorResponse struct {
	Error ErrorBody `json:"error"`
}

type ErrorBody struct {
	Code    string       `json:"code"`
	Message string       `json:"message"`
	Details []FieldError `json:"details,omitempty"`
}

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}
