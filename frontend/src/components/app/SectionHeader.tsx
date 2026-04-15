import type { ReactNode } from "react";

export function SectionHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="panel section-header">
      <div>
        <h1 style={{ marginBottom: 8 }}>{title}</h1>
        {description ? <p className="muted" style={{ margin: 0 }}>{description}</p> : null}
      </div>
      {actions ? <div className="actions">{actions}</div> : null}
    </div>
  );
}
