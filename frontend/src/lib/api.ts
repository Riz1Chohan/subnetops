const envApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

function defaultApiBase() {
  const { hostname, port } = window.location;
  const isLocalDev = hostname === "localhost" || hostname === "127.0.0.1";
  if (envApiBase) return envApiBase.replace(/\/$/, "");
  if (isLocalDev && (port === "5173" || port === "4173" || port === "3000")) {
    return "http://localhost:4000/api";
  }
  return "/api";
}

export const API_BASE = defaultApiBase();

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
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
