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
