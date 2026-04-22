package dto

type CreateTicketRequest struct {
	Title         string `json:"title"`
	Description   string `json:"description"`
	Priority      string `json:"priority"`
	Category      string `json:"category"`
	Team          string `json:"team"`
	ReporterName  string `json:"reporterName"`
	ReporterEmail string `json:"reporterEmail"`
}

type ListTicketsQuery struct {
	Q            string
	Status       string
	Priority     string
	Category     string
	Team         string
	Assignee     string
	Page         int
	PageSize     int
	SortBy       string
	SortOrder    string
	AssignedToMe bool
}

type UpdateTicketStatusRequest struct {
	Status string `json:"status"`
}

type AddCommentRequest struct {
	Message    string `json:"message"`
	AuthorName string `json:"authorName"`
	Visibility string `json:"visibility"`
}

type AssignTicketRequest struct {
	AssigneeID string `json:"assigneeId,omitempty"`
}

type RequestAttachmentUploadURLRequest struct {
	FileName    string `json:"fileName"`
	ContentType string `json:"contentType"`
	SizeBytes   int64  `json:"sizeBytes"`
}

type RequestAttachmentUploadURLResponse struct {
	AttachmentID  string            `json:"attachmentId"`
	ObjectKey     string            `json:"objectKey"`
	UploadURL     string            `json:"uploadUrl"`
	UploadMethod  string            `json:"uploadMethod"`
	UploadHeaders map[string]string `json:"uploadHeaders"`
	ExpiresAt     string            `json:"expiresAt"`
}

type SaveAttachmentRequest struct {
	AttachmentID string `json:"attachmentId"`
	ObjectKey    string `json:"objectKey"`
	FileName     string `json:"fileName"`
}

type AttachmentDownloadURLResponse struct {
	FileName    string `json:"fileName"`
	DownloadURL string `json:"downloadUrl"`
	ExpiresAt   string `json:"expiresAt"`
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

type AssignableUserResponse struct {
	Subject     string `json:"subject"`
	DisplayName string `json:"displayName"`
	Email       string `json:"email"`
	AvatarURL   string `json:"avatarUrl,omitempty"`
	Role        string `json:"role"`
}

type TicketResponse struct {
	ID             string               `json:"id"`
	Title          string               `json:"title"`
	Description    string               `json:"description"`
	Status         string               `json:"status"`
	Priority       string               `json:"priority"`
	Category       string               `json:"category"`
	Team           string               `json:"team"`
	CreatedBy      string               `json:"createdBy,omitempty"`
	CreatedByName  string               `json:"createdByName,omitempty"`
	CreatedByEmail string               `json:"createdByEmail,omitempty"`
	ReporterID     string               `json:"reporterId,omitempty"`
	ReporterName   string               `json:"reporterName"`
	ReporterEmail  string               `json:"reporterEmail"`
	AssigneeID     string               `json:"assigneeId,omitempty"`
	AssigneeName   string               `json:"assigneeName,omitempty"`
	AssignedAt     string               `json:"assignedAt,omitempty"`
	Comments       []CommentResponse    `json:"comments"`
	Attachments    []AttachmentResponse `json:"attachments"`
	CreatedAt      string               `json:"createdAt"`
	UpdatedAt      string               `json:"updatedAt"`
}

type TicketListPagination struct {
	Page       int  `json:"page"`
	PageSize   int  `json:"page_size"`
	TotalItems int  `json:"total_items"`
	TotalPages int  `json:"total_pages"`
	HasNext    bool `json:"has_next"`
}

type TicketListResponse struct {
	Items      []TicketResponse     `json:"items"`
	Pagination TicketListPagination `json:"pagination"`
}

type CommentResponse struct {
	ID         string `json:"id"`
	TicketID   string `json:"ticketId"`
	Message    string `json:"message"`
	AuthorName string `json:"authorName"`
	AuthorRole string `json:"authorRole,omitempty"`
	Visibility string `json:"visibility"`
	CreatedAt  string `json:"createdAt"`
	UpdatedAt  string `json:"updatedAt"`
}

type AttachmentResponse struct {
	ID             string `json:"id"`
	TicketID       string `json:"ticketId"`
	FileName       string `json:"fileName"`
	ContentType    string `json:"contentType"`
	SizeBytes      int64  `json:"sizeBytes"`
	UploadedByID   string `json:"uploadedById,omitempty"`
	UploadedByName string `json:"uploadedByName,omitempty"`
	UploadedByRole string `json:"uploadedByRole,omitempty"`
	CreatedAt      string `json:"createdAt"`
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
	Code      string       `json:"code"`
	Message   string       `json:"message"`
	RequestID string       `json:"requestId,omitempty"`
	Details   []FieldError `json:"details,omitempty"`
}

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}
