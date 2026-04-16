export type TicketStatus = "open" | "in_progress" | "resolved";
export type TicketPriority = "low" | "medium" | "high";

export type Comment = {
  id: string;
  ticketId: string;
  message: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
};

export type Ticket = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdBy?: string;
  createdByName?: string;
  createdByEmail?: string;
  reporterId?: string;
  reporterName: string;
  reporterEmail: string;
  assigneeId?: string;
  assigneeName?: string;
  assignedAt?: string;
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
};

export type CreateTicketInput = {
  title: string;
  description: string;
  priority: TicketPriority;
  reporterName: string;
  reporterEmail: string;
};

export type NewCommentInput = {
  message: string;
  authorName: string;
};

export type AssignTicketInput = {
  assigneeId?: string;
};
