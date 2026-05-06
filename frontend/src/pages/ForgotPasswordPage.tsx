import { useState } from "react";
import { Link } from "react-router-dom";
import { useRequestPasswordReset } from "../features/auth/hooks";

export function ForgotPasswordPage() {
  const requestResetMutation = useRequestPasswordReset();
  const [email, setEmail] = useState("");

  return (
    <div>
      <h1>Reset password</h1>
      <p className="muted">Request a password reset link for your SubnetOps account.</p>
      <form
        style={{ display: "grid", gap: 12 }}
        onSubmit={async (e) => {
          e.preventDefault();
          await requestResetMutation.mutateAsync({ email });
        }}
      >
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" autoComplete="email" required />
        {requestResetMutation.error ? <p className="error-text">{requestResetMutation.error.message}</p> : null}
        {requestResetMutation.data ? (
          <div className="panel" style={{ padding: 12 }}>
            <p style={{ marginTop: 0 }}>{requestResetMutation.data.message}</p>
            {requestResetMutation.data.resetToken ? (
              <p className="muted" style={{ marginBottom: 0, wordBreak: "break-all" }}>
                Development reset token: {requestResetMutation.data.resetToken}
              </p>
            ) : null}
          </div>
        ) : null}
        <button type="submit" disabled={requestResetMutation.isPending}>{requestResetMutation.isPending ? "Preparing..." : "Request reset"}</button>
      </form>
      <p className="muted"><Link to="/login">Back to login</Link></p>
    </div>
  );
}
