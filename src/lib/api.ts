import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY);
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  headers.set("apikey", PUBLISHABLE_KEY);
  headers.set("Content-Type", "application/json");
  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  const response = await fetch(`${SUPABASE_URL}/functions/v1/api/${path.replace(/^\//, "")}`, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : `API request failed (${response.status})`);
  return payload as T;
}

export const apiGet = <T = unknown>(path: string) => request<T>(path);
export const apiPost = <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });
export const apiPatch = <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) });
export const apiDelete = <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: "DELETE", body: JSON.stringify(body ?? {}) });
