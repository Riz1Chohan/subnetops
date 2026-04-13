import { api } from "../../lib/api";
import type { NotificationItem, NotificationSummary } from "../../lib/types";

export function getNotifications() {
  return api<NotificationItem[]>("/notifications");
}

export function getNotificationSummary() {
  return api<NotificationSummary>("/notifications/summary");
}

export function markNotificationRead(notificationId: string) {
  return api<{ message: string }>(`/notifications/${notificationId}/read`, { method: "PATCH", body: JSON.stringify({}) });
}

export function markAllNotificationsRead() {
  return api<{ message: string }>("/notifications/read-all", { method: "POST", body: JSON.stringify({}) });
}
