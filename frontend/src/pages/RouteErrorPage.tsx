import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";

export function RouteErrorPage() {
  const error = useRouteError();

  let title = "Something went wrong";
  let message = "SubnetOps hit an unexpected error while trying to load this page.";

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = typeof error.data === "string" ? error.data : message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <main className="page">
      <section className="panel" style={{ display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0 }}>{title}</h1>
        <p className="muted" style={{ margin: 0 }}>{message}</p>
        <div className="form-actions">
          <Link to="/dashboard" className="link-button">Back to Dashboard</Link>
          <button type="button" onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      </section>
    </main>
  );
}
