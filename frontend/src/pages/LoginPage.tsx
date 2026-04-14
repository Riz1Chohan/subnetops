import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLogin } from "../features/auth/hooks";

export function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const [email, setEmail] = useState("demo@subnetops.local");
  const [password, setPassword] = useState("Demo1234!");

  return (
    <div>
      <h1>Login</h1>
      <p className="muted">Use the demo account or sign in with your existing SubnetOps account.</p>
      <form
        style={{ display: "grid", gap: 12 }}
        onSubmit={async (e) => {
          e.preventDefault();
          await loginMutation.mutateAsync({ email, password });
          navigate("/dashboard", { replace: true });
        }}
      >
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" autoComplete="username" required />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" autoComplete="current-password" required />
        {loginMutation.error ? <p className="error-text">{loginMutation.error.message}</p> : null}
        <button type="submit" disabled={loginMutation.isPending}>{loginMutation.isPending ? "Signing in..." : "Login"}</button>
      </form>
      <p className="muted">Demo login: demo@subnetops.local / Demo1234!</p>
      <p className="muted"><Link to="/forgot-password">Forgot password?</Link></p>
      <p className="muted">No account yet? <Link to="/register">Create one</Link></p>
    </div>
  );
}
