import { apiRequest } from "./client";
import type { AssignTicketInput, Comment, CreateTicketInput, NewCommentInput, Ticket, TicketStatus } from "../types/ticket";

export function listTickets(options?: { assignedToMe?: boolean }) {
  const query = options?.assignedToMe ? "?assignedToMe=true" : "";
  return apiRequest<Ticket[]>(`/tickets${query}`);
}

export function getTicket(ticketId: string) {
  return apiRequest<Ticket>(`/tickets/${ticketId}`);
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
