import { apiRequest } from "./client";
import type { PaginatedResult } from "../types/api";
import type { AssignTicketInput, Comment, CreateTicketInput, NewCommentInput, Ticket, TicketActivity, TicketStatus } from "../types/ticket";

type ListTicketsOptions = {
  q?: string;
  status?: "all" | Ticket["status"];
  priority?: "all" | Ticket["priority"];
  assignee?: "all" | "me" | "unassigned";
  page?: number;
  pageSize?: number;
  sortBy?: "updated_at" | "created_at" | "priority" | "status";
  sortOrder?: "asc" | "desc";
};

export function listTickets(options?: ListTicketsOptions) {
  const query = new URLSearchParams();

  if (options?.q?.trim()) {
    query.set("q", options.q.trim());
  }

  if (options?.status && options.status !== "all") {
    query.set("status", options.status);
  }

  if (options?.priority && options.priority !== "all") {
    query.set("priority", options.priority);
  }

  if (options?.assignee && options.assignee !== "all") {
    query.set("assignee", options.assignee);
  }

  query.set("page", String(options?.page ?? 1));
  query.set("page_size", String(options?.pageSize ?? 10));
  query.set("sort_by", options?.sortBy ?? "updated_at");
  query.set("sort_order", options?.sortOrder ?? "desc");

  return apiRequest<PaginatedResult<Ticket>>(`/tickets?${query.toString()}`);
}

export function getTicket(ticketId: string) {
  return apiRequest<Ticket>(`/tickets/${ticketId}`);
}

export function getTicketActivities(ticketId: string) {
  return apiRequest<TicketActivity[]>(`/tickets/${ticketId}/activities`);
}

export function createTicket(input: CreateTicketInput) {
  return apiRequest<Ticket>("/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTicketStatus(ticketId: string, status: TicketStatus) {
  return apiRequest<Ticket>(`/tickets/${ticketId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function addComment(ticketId: string, input: NewCommentInput) {
  return apiRequest<Comment>(`/tickets/${ticketId}/comments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function assignTicket(ticketId: string, input: AssignTicketInput = {}) {
  return apiRequest<Ticket>(`/tickets/${ticketId}/assignment`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
