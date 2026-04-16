import { useEffect, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useLogout, useCurrentUser } from "../features/auth/hooks";
import { useAssignedTasks } from "../features/comments/hooks";
import { useNotificationSummary } from "../features/notifications/hooks";
import { NotificationPanel } from "../features/notifications/components/NotificationPanel";
import { Brand } from "../components/app/Brand";

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useCurrentUser();
  const logoutMutation = useLogout();
  const notificationSummaryQuery = useNotificationSummary();
  const assignedTasksQuery = useAssignedTasks();
  const overdueTasks = (assignedTasksQuery.data ?? []).filter((task) => task.dueDate && task.taskStatus !== "DONE" && new Date(task.dueDate).getTime() < Date.now()).length;

  const isProjectWorkspace = location.pathname.startsWith("/projects/") && location.pathname !== "/projects/new";
  const notificationMenuRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const menu = notificationMenuRef.current;
      if (!menu || !menu.hasAttribute("open")) return;
      if (menu.contains(event.target as Node)) return;
      menu.removeAttribute("open");
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand-row">
          <Brand to="/dashboard" showCompany />
          <span className="brand-slogan">Plan networks with clarity.</span>
        </div>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/projects/new">Start Plan</Link>
          <Link to="/ai">AI</Link>
          <Link to="/my-tasks">My Tasks{overdueTasks > 0 ? ` (${overdueTasks})` : ""}</Link>
          <Link to="/dashboard/about">About</Link>
          <Link to="/dashboard/help">Help</Link>
          <Link to="/dashboard/faq">FAQ</Link>
          <Link to="/account/security">Account</Link>
          <div className="topbar-account-cluster">
            <details ref={notificationMenuRef} className="topbar-notification-menu">
              <summary>Notifications {notificationSummaryQuery.data?.unread ?? 0}</summary>
              <div className="topbar-notification-popover">
                <NotificationPanel />
              </div>
            </details>
            <div className="topbar-user-pill">
              <span className="muted">Logged in</span>
              <strong>{data?.user?.fullName?.trim() || data?.user?.email?.split("@")[0] || "Guest"}</strong>
            </div>
            <button
              type="button"
              onClick={async () => {
                await logoutMutation.mutateAsync();
                navigate("/login", { replace: true });
              }}
            >
              Logout
            </button>
          </div>
        </nav>
      </header>
      <main className={isProjectWorkspace ? "page page-workspace" : "page"}>
        <Outlet />
      </main>
    </div>
  );
}
