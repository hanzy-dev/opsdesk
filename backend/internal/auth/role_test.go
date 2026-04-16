package auth

import "testing"

func TestResolveRolePrefersAdminThenAgentThenReporter(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name   string
		groups []string
		want   Role
	}{
		{
			name:   "defaults to reporter",
			groups: nil,
			want:   RoleReporter,
		},
		{
			name:   "agent overrides reporter",
			groups: []string{"reporter", "agent"},
			want:   RoleAgent,
		},
		{
			name:   "admin overrides all",
			groups: []string{"reporter", "agent", "admin"},
			want:   RoleAdmin,
		},
		{
			name:   "case insensitive lookup",
			groups: []string{" Agent "},
			want:   RoleAgent,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			if got := ResolveRole(tt.groups); got != tt.want {
				t.Fatalf("ResolveRole() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestRolePermissions(t *testing.T) {
	t.Parallel()

	if !RoleReporter.CanCreateTicket() {
		t.Fatal("expected reporter to create tickets")
	}

	if RoleReporter.CanViewOperationalTickets() {
		t.Fatal("expected reporter to not view operational tickets")
	}

	if !RoleAgent.CanUpdateTicketStatus() {
		t.Fatal("expected agent to update ticket status")
	}

	if !RoleAdmin.CanViewOperationalTickets() || !RoleAdmin.CanUpdateTicketStatus() || !RoleAdmin.CanAddComments() {
		t.Fatal("expected admin to have full operational permissions")
	}
}
