import { ApiError, apiRequest } from "./client";
import type { PaginatedResult } from "../types/api";
import type {
  AssignTicketInput,
  Attachment,
  AttachmentDownloadTarget,
  AttachmentUploadTarget,
  Comment,
  CreateTicketInput,
  NewCommentInput,
  RequestAttachmentUploadUrlInput,
  SaveAttachmentInput,
  Ticket,
  TicketCategory,
  TicketActivity,
  TicketStatus,
  TicketTeam,
} from "../types/ticket";

type ListTicketsOptions = {
  q?: string;
  status?: "all" | Ticket["status"];
  priority?: "all" | Ticket["priority"];
  category?: "all" | TicketCategory;
  team?: "all" | TicketTeam;
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

  if (options?.category && options.category !== "all") {
    query.set("category", options.category);
  }

  if (options?.team && options.team !== "all") {
    query.set("team", options.team);
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

export function requestAttachmentUploadUrl(ticketId: string, input: RequestAttachmentUploadUrlInput) {
  return apiRequest<AttachmentUploadTarget>(`/tickets/${ticketId}/attachments/upload-url`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function saveAttachment(ticketId: string, input: SaveAttachmentInput) {
  return apiRequest<Attachment>(`/tickets/${ticketId}/attachments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getAttachmentDownloadUrl(ticketId: string, attachmentId: string) {
  return apiRequest<AttachmentDownloadTarget>(`/tickets/${ticketId}/attachments/${attachmentId}/download`);
}

export function uploadAttachmentFile(
  target: Pick<AttachmentUploadTarget, "uploadUrl" | "uploadMethod" | "uploadHeaders">,
  file: File,
  onProgress?: (progress: number) => void,
  errorMessage = "Upload lampiran ke penyimpanan belum berhasil.",
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(target.uploadMethod || "PUT", target.uploadUrl);

    Object.entries(target.uploadHeaders ?? {}).forEach(([header, value]) => {
      request.setRequestHeader(header, value);
    });

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress?.(Math.round((event.loaded / event.total) * 100));
    };

    request.onerror = () => {
      reject(new ApiError(errorMessage, 0, "attachment_upload_failed"));
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }

      reject(new ApiError(errorMessage, request.status, "attachment_upload_failed"));
    };

    request.send(file);
  });
}
