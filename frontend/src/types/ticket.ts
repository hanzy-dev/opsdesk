export type TicketStatus = "open" | "in_progress" | "resolved";
export type TicketPriority = "low" | "medium" | "high";
export type TicketCategory =
  | "account_access"
  | "network"
  | "hardware"
  | "application_bug"
  | "service_request"
  | "other";
export type TicketTeam = "helpdesk" | "infrastructure" | "applications" | "operations";
export type CommentVisibility = "public" | "internal";

export type Comment = {
  id: string;
  ticketId: string;
  message: string;
  authorName: string;
  authorRole?: "reporter" | "agent" | "admin";
  visibility: CommentVisibility;
  createdAt: string;
  updatedAt: string;
};

export type TicketActivity = {
  id: string;
  ticketId: string;
  actorId?: string;
  actorName?: string;
  actorRole?: "reporter" | "agent" | "admin";
  action: "ticket_created" | "status_changed" | "comment_added" | "assignment_changed" | "attachment_added";
  summary: string;
  metadata?: Record<string, string>;
  timestamp: string;
};

export type Attachment = {
  id: string;
  ticketId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedById?: string;
  uploadedByName?: string;
  uploadedByRole?: "reporter" | "agent" | "admin";
  createdAt: string;
};

export type Ticket = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  team: TicketTeam;
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
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
};

export type CreateTicketInput = {
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  team: TicketTeam;
  reporterName: string;
  reporterEmail: string;
};

export type NewCommentInput = {
  message: string;
  authorName: string;
  visibility?: CommentVisibility;
};

export type AssignTicketInput = {
  assigneeId?: string;
};

export type RequestAttachmentUploadUrlInput = {
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

export type AttachmentUploadTarget = {
  attachmentId: string;
  objectKey: string;
  uploadUrl: string;
  uploadMethod: string;
  uploadHeaders: Record<string, string>;
  expiresAt: string;
};

export type SaveAttachmentInput = {
  attachmentId: string;
  objectKey: string;
  fileName: string;
};

export type AttachmentDownloadTarget = {
  fileName: string;
  downloadUrl: string;
  expiresAt: string;
};
