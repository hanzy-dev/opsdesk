export type NotificationItem = {
  id: string;
  ticketId: string;
  ticketTitle: string;
  type: "assignment_changed" | "status_changed" | "comment_added";
  title: string;
  message: string;
  timestamp: string;
  actorName?: string;
  link: string;
};
