import { api } from "../../lib/api";
import type { NotificationPreference } from "../../lib/types";

export function getNotificationPreferences() {
  return api<NotificationPreference>("/notification-preferences");
}

export function updateNotificationPreferences(input: Partial<NotificationPreference>) {
  return api<NotificationPreference>("/notification-preferences", { method: "PATCH", body: JSON.stringify(input) });
}
