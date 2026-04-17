# SubnetOps v352

This pass fixes the deployed login/session path after moving the frontend to a prebuilt static deployment.

## Changes
- updated frontend API base inference so deployed static frontend can automatically call the Render backend service when `VITE_API_BASE_URL` is not injected at build time
- updated backend CORS handling to support a comma-separated allowlist instead of a single origin string
- set default Render Blueprint `CORS_ORIGIN` to include the deployed frontend URL plus local dev origins
- set Blueprint `VITE_API_BASE_URL` to the default deployed backend API URL
- refreshed backend env example files to match the new CORS allowlist format

## Why
The frontend was successfully deploying as a committed static build, but login could fail because the static build no longer reliably inherited a backend API base during deployment. The browser could then fall back to `/api` on the frontend host, while the backend CORS config still expected a manually supplied single origin.

This pass makes the deployed static frontend and backend line up by default for the Render service names already used in this repo.
