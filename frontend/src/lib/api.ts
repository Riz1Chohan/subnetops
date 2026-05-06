const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

function cleanBase(value: string) {
<<<<<<< HEAD
  return value.replace(/\/+$/, "");
=======
  return value.replace(/\/$/, "");
}

function inferHostedApiBase() {
  const { protocol, hostname, port } = window.location;
  const isLocalDev = hostname === "localhost" || hostname === "127.0.0.1";

  if (isLocalDev && (port === "5173" || port === "4173" || port === "3000")) {
    return "http://localhost:4000/api";
  }

  if (/\.onrender\.com$/i.test(hostname)) {
    if (hostname.includes("-frontend")) {
      return `${protocol}//${hostname.replace("-frontend", "-backend")}/api`;
    }
    if (hostname.includes("frontend")) {
      return `${protocol}//${hostname.replace("frontend", "backend")}/api`;
    }
  }

  return null;
}

function defaultApiBase() {
  if (configuredApiBaseUrl) return cleanBase(configuredApiBaseUrl);
  const inferredHostedBase = inferHostedApiBase();
  if (inferredHostedBase) return cleanBase(inferredHostedBase);
  return "/api";
>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8
}

function resolveApiBase() {
  if (configuredApiBaseUrl) return cleanBase(configuredApiBaseUrl);

  if (!import.meta.env.PROD) {
    return "http://localhost:4000/api";
  }

  throw new Error(
    "VITE_API_BASE_URL is required for production builds. SubnetOps will not infer hostnames or silently fall back to /api in production.",
  );
}

export const API_BASE = resolveApiBase();

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

function readCookie(name: string) {
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function isUnsafeMethod(method?: string) {
  const normalized = (method || "GET").toUpperCase();
  return !["GET", "HEAD", "OPTIONS"].includes(normalized);
}

async function ensureCsrfToken() {
  const existingToken = readCookie("subnetops_csrf");
  if (existingToken) return existingToken;

  const response = await fetch(apiUrl("/auth/csrf"), {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Could not initialize request security token");
  }

  const body = await response.json().catch(() => ({}));
  return readCookie("subnetops_csrf") || body.csrfToken || null;
}

async function withSecurityHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers || {});

  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  if (isUnsafeMethod(init?.method)) {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
  }

  return headers;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers: await withSecurityHeaders(init),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(errorBody.message || "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

<<<<<<< HEAD
=======
async function parseBlobError(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const errorBody = await response.json().catch(() => ({ message: "Request failed" }));
    return errorBody.message || "Request failed";
  }

  const text = await response.text().catch(() => "");
  return text.trim().slice(0, 300) || `Request failed with status ${response.status}`;
}

>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8
export async function apiBlob(path: string, init?: RequestInit): Promise<Blob> {
  const headers = new Headers(init?.headers || {});
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  } else if (!init?.body && headers.has("Content-Type")) {
    headers.delete("Content-Type");
  }

  if (isUnsafeMethod(init?.method)) {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    throw new Error(await parseBlobError(response));
  }

  const blob = await response.blob();
  const contentType = response.headers.get("content-type") || blob.type || "";
  if (blob.size === 0) {
    throw new Error("Export failed because the backend returned an empty file.");
  }
  if (contentType.includes("application/json") || contentType.includes("text/html")) {
    const text = await blob.text().catch(() => "");
    throw new Error(text.trim().slice(0, 300) || "Export failed because the backend did not return a downloadable file.");
  }

  return blob;
}
