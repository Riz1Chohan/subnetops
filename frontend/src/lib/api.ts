const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

function cleanBase(value: string) {
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
}

export const API_BASE = defaultApiBase();

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
    const errorBody = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(errorBody.message || "Request failed");
  }

  return response.blob();
}
