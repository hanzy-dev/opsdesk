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

type TicketResponse struct {
	ID            string            `json:"id"`
	Title         string            `json:"title"`
	Description   string            `json:"description"`
	Status        string            `json:"status"`
	Priority      string            `json:"priority"`
	ReporterName  string            `json:"reporterName"`
	ReporterEmail string            `json:"reporterEmail"`
	Comments      []CommentResponse `json:"comments,omitempty"`
	CreatedAt     string            `json:"createdAt"`
	UpdatedAt     string            `json:"updatedAt"`
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
