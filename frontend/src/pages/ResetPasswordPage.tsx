import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useResetPassword } from "../features/auth/hooks";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetPasswordMutation = useResetPassword();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    const fromUrl = searchParams.get("token") || "";
    if (fromUrl) setToken(fromUrl);
  }, [searchParams]);

  return (
    <div>
      <h1>Choose a new password</h1>
      <p className="muted">Use your reset token to set a new SubnetOps password.</p>
      <form
        style={{ display: "grid", gap: 12 }}
        onSubmit={async (e) => {
          e.preventDefault();
          await resetPasswordMutation.mutateAsync({ token, newPassword });
          navigate("/login", { replace: true });
        }}
      >
        <textarea value={token} onChange={(e) => setToken(e.target.value)} placeholder="Reset token" rows={4} required />
        <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" type="password" autoComplete="new-password" required minLength={8} />
        {resetPasswordMutation.error ? <p className="error-text">{resetPasswordMutation.error.message}</p> : null}
        <button type="submit" disabled={resetPasswordMutation.isPending}>{resetPasswordMutation.isPending ? "Resetting..." : "Reset password"}</button>
      </form>
      <p className="muted"><Link to="/forgot-password">Need a reset token?</Link></p>
    </div>
  );
}
