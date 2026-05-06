import type { ReactNode } from "react";

export function ErrorState({
  title = "Unable to load this view",
  message = "SubnetOps could not load the requested data right now.",
  action,
}: {
  title?: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <section className="panel empty-state">
      <h2 style={{ marginTop: 0, marginBottom: 8 }}>{title}</h2>
      <p className="error-text" style={{ margin: 0 }}>{message}</p>
      {action ? <div className="form-actions" style={{ marginTop: 14 }}>{action}</div> : null}
    </section>
  );
}
