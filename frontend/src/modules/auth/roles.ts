export type UserRole = "reporter" | "agent" | "admin";

export function resolveRole(groups: string[]): UserRole {
  const normalizedGroups = groups.map((group) => group.trim().toLowerCase());

  if (normalizedGroups.includes("admin")) {
    return "admin";
  }

  if (normalizedGroups.includes("agent")) {
    return "agent";
  }

  return "reporter";
}

export function getRoleLabel(role: UserRole) {
  switch (role) {
    case "admin":
      return "Admin";
    case "agent":
      return "Petugas";
    default:
      return "Pelapor";
  }
}

export function canCreateTickets(role: UserRole) {
  return role === "reporter" || role === "admin";
}

export function canUpdateTicketStatus(role: UserRole) {
  return role === "agent" || role === "admin";
}

export function canViewOperationalTickets(role: UserRole) {
  return role === "agent" || role === "admin";
}

export function canAssignTickets(role: UserRole) {
  return role === "agent" || role === "admin";
}
