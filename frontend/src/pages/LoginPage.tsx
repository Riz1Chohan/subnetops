import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLogin } from "../features/auth/hooks";

export function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div>
      <h1>Login</h1>
      <p className="muted">Sign in with your existing SubnetOps account, or load the demo credentials if you just want to explore.</p>
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
        <div className="form-actions" style={{ marginTop: 0 }}>
          <button type="button" className="link-button" onClick={() => { setEmail("demo@subnetops.local"); setPassword("Demo1234!"); }}>Use demo account</button>
          <Link to="/forgot-password" className="link-button">Forgot password?</Link>
        </div>
        <button type="submit" disabled={loginMutation.isPending}>{loginMutation.isPending ? "Signing in..." : "Login"}</button>
      </form>
      <p className="muted">Demo login: demo@subnetops.local / Demo1234!</p>
      <p className="muted">No account yet? <Link to="/register">Create one</Link></p>
    </div>
  );
}
