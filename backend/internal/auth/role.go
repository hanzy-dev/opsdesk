package auth

import "strings"

type Role string

const (
	RoleReporter Role = "reporter"
	RoleAgent    Role = "agent"
	RoleAdmin    Role = "admin"
)

func ResolveRole(groups []string) Role {
	role := RoleReporter

	for _, group := range groups {
		switch strings.ToLower(strings.TrimSpace(group)) {
		case string(RoleAdmin):
			return RoleAdmin
		case string(RoleAgent):
			role = RoleAgent
		case string(RoleReporter):
			if role == "" {
				role = RoleReporter
			}
		}
	}

	return role
}

func (r Role) CanCreateTicket() bool {
	return r == RoleReporter || r == RoleAdmin
}

func (r Role) CanViewOperationalTickets() bool {
	return r == RoleAgent || r == RoleAdmin
}

func (r Role) CanUpdateTicketStatus() bool {
	return r == RoleAgent || r == RoleAdmin
}

func (r Role) CanAddComments() bool {
	return r == RoleReporter || r == RoleAgent || r == RoleAdmin
}
