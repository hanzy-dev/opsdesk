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
  reporterName: string;
  reporterEmail: string;
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
