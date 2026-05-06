import { Link } from "react-router-dom";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "../hooks";

export function NotificationPanel() {
  const notificationsQuery = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllMutation = useMarkAllNotificationsRead();
  const items = notificationsQuery.data ?? [];

  return (
    <div className="panel" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Notifications</h2>
        <button type="button" onClick={async () => { await markAllMutation.mutateAsync(); }} disabled={markAllMutation.isPending || items.length === 0}>
          {markAllMutation.isPending ? "Updating..." : "Mark all read"}
        </button>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item) => (
          <div key={item.id} className="validation-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <strong>{item.title}</strong>
              <span className={item.status === "UNREAD" ? "badge badge-warning" : "badge badge-info"}>{item.status === "UNREAD" ? "Unread" : "Read"}</span>
            </div>
            <p style={{ margin: "6px 0" }}>{item.message}</p>
            <div className="form-actions">
              {item.link ? <Link to={item.link} className="link-button">Open</Link> : null}
              {item.status === "UNREAD" ? <button type="button" onClick={async () => { await markReadMutation.mutateAsync(item.id); }}>Mark read</button> : null}
            </div>
            <p className="muted" style={{ margin: 0 }}>{new Date(item.createdAt).toLocaleString()}</p>
          </div>
        ))}
        {!notificationsQuery.isLoading && items.length === 0 ? <p className="muted">No notifications yet.</p> : null}
      </div>
    </div>
  );
}
