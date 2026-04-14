export function LoadingState({ title = "Loading...", message = "Please wait while SubnetOps prepares this view." }: { title?: string; message?: string }) {
  return (
    <section className="panel" style={{ display: "grid", gap: 8 }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
      <p className="muted" style={{ margin: 0 }}>{message}</p>
    </section>
  );
}
