# Phase 14 hardening notes

## What changed

- Gated the frontend demo-login button and visible demo credentials behind `VITE_ENABLE_DEMO_LOGIN=true` or Vite development mode.
- Left Render production config with demo login disabled by default.
- Extended the security hardening release check so future packages fail if demo credentials are exposed without an explicit environment flag.

## Why this matters

Publicly displaying a reusable demo email/password on the production login screen is weak security posture and weak product posture. Even if seeding is disabled in production, the UI was still advertising credentials and making the app look less serious.

## Manual verification

```bash
# Frontend production build should not show the demo login helper unless explicitly enabled.
cd frontend
npm ci --include=dev --no-audit --no-fund
npm run build

# Security discipline check should include the demo-login gate.
cd ..
node scripts/check-security-hardening.cjs
```

## No scope creep

This pass did not add features. It removed an amateur production-facing weakness and added a guardrail to stop regression.
