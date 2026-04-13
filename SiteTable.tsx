import { api } from "../../lib/api";

export interface SafeUser {
  id: string;
  email: string;
  fullName?: string;
  planTier: "FREE" | "PAID";
  createdAt: string;
}

export function register(input: { fullName?: string; email: string; password: string }) {
  return api<{ user: SafeUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: { email: string; password: string }) {
  return api<{ user: SafeUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function logout() {
  return api<{ message: string }>("/auth/logout", { method: "POST" });
}

export function getMe() {
  return api<{ user: SafeUser }>("/auth/me");
}
