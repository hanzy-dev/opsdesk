package httpapi

import (
	"opsdesk/backend/internal/domain"
	"opsdesk/backend/internal/dto"
)

func toTicketResponse(ticket domain.Ticket) dto.TicketResponse {
	comments := make([]dto.CommentResponse, 0, len(ticket.Comments))
	for _, comment := range ticket.Comments {
		comments = append(comments, toCommentResponse(comment))
	}

	return dto.TicketResponse{
		ID:            ticket.ID,
		Title:         ticket.Title,
		Description:   ticket.Description,
		Status:        string(ticket.Status),
		Priority:      string(ticket.Priority),
		ReporterName:  ticket.ReporterName,
		ReporterEmail: ticket.ReporterEmail,
		Comments:      comments,
		CreatedAt:     domain.FormatTimestamp(ticket.CreatedAt),
		UpdatedAt:     domain.FormatTimestamp(ticket.UpdatedAt),
	}
}

func toCommentResponse(comment domain.Comment) dto.CommentResponse {
	return dto.CommentResponse{
		ID:         comment.ID,
		TicketID:   comment.TicketID,
		Message:    comment.Message,
		AuthorName: comment.AuthorName,
		CreatedAt:  domain.FormatTimestamp(comment.CreatedAt),
		UpdatedAt:  domain.FormatTimestamp(comment.UpdatedAt),
	}
}
