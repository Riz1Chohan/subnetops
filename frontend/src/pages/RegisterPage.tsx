import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegister } from "../features/auth/hooks";

export function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div>
      <h1>Create account</h1>
      <p className="muted">Start with a free account and build your first project.</p>
      <form
        style={{ display: "grid", gap: 12 }}
        onSubmit={async (e) => {
          e.preventDefault();
          await registerMutation.mutateAsync({ fullName: fullName.trim() || undefined, email, password });
          navigate("/dashboard", { replace: true });
        }}
      >
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" autoComplete="name" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" autoComplete="email" required />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" autoComplete="new-password" required minLength={8} />
        {registerMutation.error ? <p className="error-text">{registerMutation.error.message}</p> : null}
        <button type="submit" disabled={registerMutation.isPending}>{registerMutation.isPending ? "Creating..." : "Create account"}</button>
      </form>
      <p className="muted">Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}
