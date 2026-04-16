package httpapi

import (
	"time"

	"opsdesk/backend/internal/domain"
	"opsdesk/backend/internal/dto"
)

func toTicketResponse(ticket domain.Ticket) dto.TicketResponse {
	comments := make([]dto.CommentResponse, 0, len(ticket.Comments))
	for _, comment := range ticket.Comments {
		comments = append(comments, toCommentResponse(comment))
	}

	attachments := make([]dto.AttachmentResponse, 0, len(ticket.Attachments))
	for _, attachment := range ticket.Attachments {
		attachments = append(attachments, toAttachmentResponse(attachment))
	}

	return dto.TicketResponse{
		ID:             ticket.ID,
		Title:          ticket.Title,
		Description:    ticket.Description,
		Status:         string(ticket.Status),
		Priority:       string(ticket.Priority),
		CreatedBy:      ticket.CreatedBy,
		CreatedByName:  ticket.CreatedByName,
		CreatedByEmail: ticket.CreatedByEmail,
		ReporterID:     ticket.ReporterID,
		ReporterName:   ticket.ReporterName,
		ReporterEmail:  ticket.ReporterEmail,
		AssigneeID:     ticket.AssigneeID,
		AssigneeName:   ticket.AssigneeName,
		AssignedAt:     formatOptionalTimestamp(ticket.AssignedAt),
		Comments:       comments,
		Attachments:    attachments,
		CreatedAt:      domain.FormatTimestamp(ticket.CreatedAt),
		UpdatedAt:      domain.FormatTimestamp(ticket.UpdatedAt),
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

func toAttachmentResponse(attachment domain.Attachment) dto.AttachmentResponse {
	return dto.AttachmentResponse{
		ID:             attachment.ID,
		TicketID:       attachment.TicketID,
		FileName:       attachment.FileName,
		ContentType:    attachment.ContentType,
		SizeBytes:      attachment.SizeBytes,
		UploadedByID:   attachment.UploadedByID,
		UploadedByName: attachment.UploadedByName,
		UploadedByRole: attachment.UploadedByRole,
		CreatedAt:      domain.FormatTimestamp(attachment.CreatedAt),
	}
}

func toTicketActivityResponse(activity domain.ActivityEntry) dto.TicketActivityResponse {
	return dto.TicketActivityResponse{
		ID:        activity.ID,
		TicketID:  activity.TicketID,
		ActorID:   activity.ActorID,
		ActorName: activity.ActorName,
		ActorRole: activity.ActorRole,
		Action:    string(activity.Action),
		Summary:   activity.Summary,
		Metadata:  activity.Metadata,
		Timestamp: domain.FormatTimestamp(activity.Timestamp),
	}
}

func formatOptionalTimestamp(value time.Time) string {
	if value.IsZero() {
		return ""
	}

	return domain.FormatTimestamp(value)
}
