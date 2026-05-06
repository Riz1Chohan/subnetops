import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "../components/app/SectionHeader";
import { useChangePassword, useLogout } from "../features/auth/hooks";

export function AccountSecurityPage() {
  const navigate = useNavigate();
  const changePasswordMutation = useChangePassword();
  const logoutMutation = useLogout();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Account Security"
        description="Update your password and session security from one controlled account workspace."
      />

      <section className="panel" style={{ display: "grid", gap: 12 }}>
        <h3 style={{ margin: 0 }}>Change password</h3>
        <form
          style={{ display: "grid", gap: 12 }}
          onSubmit={async (e) => {
            e.preventDefault();
            setSuccessMessage(null);
            await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
            setSuccessMessage("Password changed. You will be signed out so you can log in again with the new password.");
            await logoutMutation.mutateAsync();
            navigate("/login", { replace: true });
          }}
        >
          <input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" type="password" autoComplete="current-password" required />
          <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" type="password" autoComplete="new-password" required minLength={8} />
          {changePasswordMutation.error ? <p className="error-text">{changePasswordMutation.error.message}</p> : null}
          {successMessage ? <p className="muted" style={{ color: "#14532d" }}>{successMessage}</p> : null}
          <button type="submit" disabled={changePasswordMutation.isPending || logoutMutation.isPending}>
            {changePasswordMutation.isPending ? "Saving..." : "Change password"}
          </button>
        </form>
        <p className="muted" style={{ marginBottom: 0 }}>Changing your password signs out the current session so you can log back in securely.</p>
      </section>
    </section>
  );
}
