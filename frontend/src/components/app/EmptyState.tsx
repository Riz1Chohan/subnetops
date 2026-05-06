import type { ReactNode } from "react";

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <section className="panel empty-state">
      <h2 style={{ marginTop: 0, marginBottom: 8 }}>{title}</h2>
      <p className="muted" style={{ margin: 0 }}>{message}</p>
      {action ? <div className="form-actions" style={{ marginTop: 14 }}>{action}</div> : null}
    </section>
  );
}
