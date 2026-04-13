import { NavLink, Outlet, useParams } from "react-router-dom";

const projectNavItems = [
  { key: "overview", label: "Overview" },
  { key: "sites", label: "Sites" },
  { key: "vlans", label: "VLANs" },
  { key: "validation", label: "Validation" },
  { key: "diagram", label: "Diagram" },
  { key: "tasks", label: "Tasks" },
  { key: "report", label: "Report" },
  { key: "settings", label: "Settings" },
];

export function ProjectLayout() {
  const { projectId = "" } = useParams();

  return (
    <section style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20, alignItems: "start" }}>
      <aside className="panel" style={{ position: "sticky", top: 16 }}>
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>Project</h2>
        <nav style={{ display: "grid", gap: 8 }}>
          {projectNavItems.map((item) => (
            <NavLink
              key={item.key}
              to={`/projects/${projectId}/${item.key}`}
              className={({ isActive }) => (isActive ? "link-button" : "muted")}
              style={{ textDecoration: "none" }}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main style={{ minWidth: 0 }}>
        <Outlet />
      </main>
    </section>
  );
}
