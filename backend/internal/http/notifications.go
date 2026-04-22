package httpapi

import (
	"fmt"
	"sort"
	"strings"

	"opsdesk/backend/internal/auth"
	"opsdesk/backend/internal/domain"
	"opsdesk/backend/internal/dto"
)

func buildNotifications(identity auth.Identity, tickets []domain.Ticket, limit int) []dto.NotificationResponse {
	notifications := make([]dto.NotificationResponse, 0)

	for _, ticket := range tickets {
		for _, activity := range ticket.Activities {
			notification, ok := toNotification(identity, ticket, activity)
			if !ok {
				continue
			}

			notifications = append(notifications, notification)
		}
	}

	sort.Slice(notifications, func(i, j int) bool {
		return notifications[i].Timestamp > notifications[j].Timestamp
	})

	if limit > 0 && len(notifications) > limit {
		return notifications[:limit]
	}

	return notifications
}

func toNotification(identity auth.Identity, ticket domain.Ticket, activity domain.ActivityEntry) (dto.NotificationResponse, bool) {
	if strings.TrimSpace(activity.ActorID) == strings.TrimSpace(identity.Subject) {
		return dto.NotificationResponse{}, false
	}

	link := fmt.Sprintf("/tickets/%s", ticket.ID)
	base := dto.NotificationResponse{
		ID:          activity.ID,
		TicketID:    ticket.ID,
		TicketTitle: ticket.Title,
		Timestamp:   domain.FormatTimestamp(activity.Timestamp),
		ActorName:   activity.ActorName,
		Link:        link,
	}

	switch activity.Action {
	case domain.TicketActivityAssignmentChanged:
		if activity.Metadata["afterAssigneeId"] != identity.Subject {
			return dto.NotificationResponse{}, false
		}

		base.Type = "assignment_changed"
		base.Title = "Tiket ditugaskan ke Anda"
		base.Message = fmt.Sprintf("%s sekarang masuk ke antrean kerja Anda.", ticket.Title)
		return base, true
	case domain.TicketActivityStatusChanged:
		if identity.Role.CanViewOperationalTickets() {
			if ticket.AssigneeID != identity.Subject && ticket.CreatedBy != identity.Subject {
				return dto.NotificationResponse{}, false
			}
		}

		base.Type = "status_changed"
		base.Title = "Status tiket diperbarui"
		base.Message = fmt.Sprintf("%s kini berstatus %s.", ticket.Title, formatNotificationStatus(activity.Metadata["afterStatus"]))
		return base, true
	case domain.TicketActivityCommentAdded:
		if activity.Metadata["commentVisibility"] == string(domain.CommentVisibilityInternal) && !identity.Role.CanViewOperationalTickets() {
			return dto.NotificationResponse{}, false
		}

		if identity.Role.CanViewOperationalTickets() {
			if ticket.AssigneeID != identity.Subject && ticket.CreatedBy != identity.Subject {
				return dto.NotificationResponse{}, false
			}
		}

		base.Type = "comment_added"
		if activity.Metadata["commentVisibility"] == string(domain.CommentVisibilityInternal) {
			base.Title = "Catatan internal baru"
			base.Message = fmt.Sprintf("Ada catatan internal baru pada tiket %s.", ticket.Title)
		} else {
			base.Title = "Komentar baru pada tiket"
			base.Message = fmt.Sprintf("Ada pembaruan komentar pada tiket %s.", ticket.Title)
		}
		return base, true
	default:
		return dto.NotificationResponse{}, false
	}
}

func formatNotificationStatus(status string) string {
	switch status {
	case "open":
		return "Terbuka"
	case "in_progress":
		return "Sedang Ditangani"
	case "resolved":
		return "Selesai"
	default:
		return "Diperbarui"
	}
}
