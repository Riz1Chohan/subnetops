import { useMemo, useState } from "react";
import type { ChangeLog } from "../../../lib/types";

function classify(message: string) {
  const value = message.toLowerCase();
  if (value.includes("vlan")) return "vlan";
  if (value.includes("site")) return "site";
  if (value.includes("comment")) return "comment";
  if (value.includes("template") || value.includes("project")) return "project";
  return "other";
}

export function ActivityFeed({ items }: { items: ChangeLog[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");

  const filtered = useMemo(() => items.filter((item) => {
    const matchesQuery = item.message.toLowerCase().includes(query.toLowerCase()) || (item.actorLabel || "").toLowerCase().includes(query.toLowerCase());
    const matchesType = type === "all" || classify(item.message) === type;
    return matchesQuery && matchesType;
  }), [items, query, type]);

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Activity Feed</h3>
        <span className="muted">Showing {filtered.length} of {items.length}</span>
      </div>
      <div className="toolbar-row" style={{ marginBottom: 12 }}>
        <input placeholder="Search activity" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">All activity</option>
          <option value="project">Project</option>
          <option value="site">Site</option>
          <option value="vlan">VLAN</option>
          <option value="comment">Comment</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {filtered.map((item) => (
          <div key={item.id} className="validation-card">
            <strong>{item.message}</strong>
            <p className="muted" style={{ margin: 0 }}>{item.actorLabel || "System"} • {new Date(item.createdAt).toLocaleString()}</p>
          </div>
        ))}
        {filtered.length === 0 ? <p className="muted">No activity matches the current filters.</p> : null}
      </div>
    </div>
  );
}
