package httpapi

import (
	"strings"

	"opsdesk/backend/internal/auth"
	"opsdesk/backend/internal/domain"
)

func canViewTicket(identity auth.Identity, ticket domain.Ticket) bool {
	if identity.Role.CanViewOperationalTickets() {
		return true
	}

	return strings.EqualFold(strings.TrimSpace(identity.Email), strings.TrimSpace(ticket.ReporterEmail))
}

func canCreateTicket(identity auth.Identity) bool {
	return identity.Role.CanCreateTicket()
}

func canUpdateTicketStatus(identity auth.Identity) bool {
	return identity.Role.CanUpdateTicketStatus()
}

func canAddComment(identity auth.Identity, ticket domain.Ticket) bool {
	if !identity.Role.CanAddComments() {
		return false
	}

	if identity.Role.CanViewOperationalTickets() {
		return true
	}

	return strings.EqualFold(strings.TrimSpace(identity.Email), strings.TrimSpace(ticket.ReporterEmail))
}
