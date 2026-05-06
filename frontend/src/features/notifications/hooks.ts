import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotifications, getNotificationSummary, markAllNotificationsRead, markNotificationRead } from "./api";

export function useNotifications() {
  return useQuery({ queryKey: ["notifications"], queryFn: getNotifications });
}

export function useNotificationSummary() {
  return useQuery({ queryKey: ["notifications", "summary"], queryFn: getNotificationSummary });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications", "summary"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications", "summary"] });
    },
  });
}
