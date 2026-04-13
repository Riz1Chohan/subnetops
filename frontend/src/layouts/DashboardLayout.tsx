import { Link, Outlet, useNavigate } from "react-router-dom";
import { useLogout, useCurrentUser } from "../features/auth/hooks";
import { useAssignedTasks } from "../features/comments/hooks";
import { useNotificationSummary } from "../features/notifications/hooks";

export function DashboardLayout() {
  const navigate = useNavigate();
  const { data } = useCurrentUser();
  const logoutMutation = useLogout();
  const notificationSummaryQuery = useNotificationSummary();
  const assignedTasksQuery = useAssignedTasks();
  const overdueTasks = (assignedTasksQuery.data ?? []).filter((task) => task.dueDate && task.taskStatus !== "DONE" && new Date(task.dueDate).getTime() < Date.now()).length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <strong>SubnetOps</strong>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/projects/new">New Project</Link>
          <Link to="/my-tasks">My Tasks{overdueTasks > 0 ? ` (${overdueTasks})` : ""}</Link>
          <span className="muted">Notifications: {notificationSummaryQuery.data?.unread ?? 0}</span>
          <span className="muted">{data?.user?.email || "Guest"}</span>
          <button
            type="button"
            onClick={async () => {
              await logoutMutation.mutateAsync();
              navigate("/login");
            }}
          >
            Logout
          </button>
        </nav>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
