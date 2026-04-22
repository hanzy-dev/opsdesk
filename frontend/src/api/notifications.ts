import { apiRequest } from "./client";
import type { NotificationItem } from "../types/notification";

export function listNotifications(limit = 12) {
  return apiRequest<NotificationItem[]>(`/notifications?limit=${limit}`);
}
