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

	if strings.TrimSpace(ticket.ReporterID) != "" && strings.EqualFold(strings.TrimSpace(identity.Subject), strings.TrimSpace(ticket.ReporterID)) {
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

	if strings.TrimSpace(ticket.ReporterID) != "" && strings.EqualFold(strings.TrimSpace(identity.Subject), strings.TrimSpace(ticket.ReporterID)) {
		return true
	}

	return strings.EqualFold(strings.TrimSpace(identity.Email), strings.TrimSpace(ticket.ReporterEmail))
}

func canAssignTicket(identity auth.Identity) bool {
	return identity.Role == auth.RoleAgent || identity.Role == auth.RoleAdmin
}

func canViewInternalComments(identity auth.Identity) bool {
	return identity.Role.CanViewOperationalTickets()
}
