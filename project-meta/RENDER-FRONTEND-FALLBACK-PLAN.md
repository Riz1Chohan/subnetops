# Render frontend fallback plan

If Render continues to fail during `Installing dependencies with npm...` for the frontend, the next durable change should be to move the frontend deploy to a **prebuilt static bundle** workflow.

## Why
Current failures are happening before `npm run build` starts. That means the issue is Render's dependency fetch step, not the application bundle itself.

## Preferred fallback
1. Build the frontend bundle outside the Render frontend deploy path.
2. Commit or publish the resulting static assets to a dedicated deploy folder.
3. Point the Render static-site service at that deploy folder so the service does not need frontend npm installation on each deploy.

## Expected effect
- removes frontend npm install as a deploy dependency
- reduces exposure to registry/network timeout failures
- keeps the backend deployment model unchanged

## When to use it
Use this fallback only if the current hardened npm/retry settings still do not stabilize frontend deploys.
