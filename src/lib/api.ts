import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const authClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { storage: typeof window !== "undefined" ? localStorage : undefined, persistSession: true, autoRefreshToken: true } });

export type ApiEnvelope<T> = { data: T; error?: { message: string; code?: string } | null; count?: number | null };

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data: { session } } = await authClient.auth.getSession();
  const headers = new Headers(init.headers);
  headers.set("apikey", PUBLISHABLE_KEY); headers.set("Content-Type", "application/json");
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

export type ApiFilter = { column: string; operator?: string; value?: unknown };
export type ApiOrder = { column: string; ascending?: boolean; nullsFirst?: boolean };

type QueryState = {
  table: string; op: "select" | "insert" | "update" | "delete" | "upsert"; select: string; selectOptions?: { count?: "exact" | "planned" | "estimated"; head?: boolean };
  filters: ApiFilter[]; or?: string; order: ApiOrder[]; limit?: number; range?: { from: number; to: number }; singleMode?: "single" | "maybeSingle"; values?: unknown; upsertOptions?: Record<string, unknown>;
};

export class ApiQueryBuilder<T = unknown> implements PromiseLike<{ data: T | null; error: Error | null }> {
  private state: QueryState;
  constructor(table: string) { this.state = { table, op: "select", select: "*", filters: [], order: [] }; }
  select(columns = "*", options?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) { this.state.select = columns; this.state.selectOptions = options; return this; }
  eq(column: string, value: unknown) { this.state.filters.push({ column, operator: "eq", value }); return this; }
  neq(column: string, value: unknown) { this.state.filters.push({ column, operator: "neq", value }); return this; }
  gt(column: string, value: unknown) { this.state.filters.push({ column, operator: "gt", value }); return this; }
  gte(column: string, value: unknown) { this.state.filters.push({ column, operator: "gte", value }); return this; }
  lt(column: string, value: unknown) { this.state.filters.push({ column, operator: "lt", value }); return this; }
  lte(column: string, value: unknown) { this.state.filters.push({ column, operator: "lte", value }); return this; }
  ilike(column: string, value: unknown) { this.state.filters.push({ column, operator: "ilike", value }); return this; }
  like(column: string, value: unknown) { this.state.filters.push({ column, operator: "like", value }); return this; }
  in(column: string, values: unknown[]) { this.state.filters.push({ column, operator: "in", value: values }); return this; }
  is(column: string, value: unknown) { this.state.filters.push({ column, operator: "is", value }); return this; }
  contains(column: string, value: unknown) { this.state.filters.push({ column, operator: "contains", value }); return this; }
  containedBy(column: string, value: unknown) { this.state.filters.push({ column, operator: "containedBy", value }); return this; }
  overlaps(column: string, value: unknown) { this.state.filters.push({ column, operator: "overlaps", value }); return this; }
  not(column: string, operator: string, value: unknown) { this.state.filters.push({ column, operator: `not.${operator}`, value }); return this; }
  filter(column: string, operator: string, value: unknown) { this.state.filters.push({ column, operator, value }); return this; }
  match(values: Record<string, unknown>) { Object.entries(values).forEach(([column, value]) => this.eq(column, value)); return this; }
  or(value: string) { this.state.or = value; return this; }
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) { this.state.order.push({ column, ascending: options?.ascending !== false, nullsFirst: options?.nullsFirst }); return this; }
  limit(value: number) { this.state.limit = value; return this; }
  range(from: number, to: number) { this.state.range = { from, to }; return this; }
  single() { this.state.singleMode = "single"; return this; }
  maybeSingle() { this.state.singleMode = "maybeSingle"; return this; }
  insert(values: unknown, _options?: Record<string, unknown>) { this.state.op = "insert"; this.state.values = values; return this; }
  upsert(values: unknown, options?: Record<string, unknown>) { this.state.op = "upsert"; this.state.values = values; this.state.upsertOptions = options; return this; }
  update(values: unknown) { this.state.op = "update"; this.state.values = values; return this; }
  delete() { this.state.op = "delete"; return this; }
  then<TResult1 = { data: T | null; error: Error | null }, TResult2 = never>(onfulfilled?: ((value: { data: T | null; error: Error | null; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): Promise<TResult1 | TResult2> {
    return request<ApiEnvelope<T>>("data", { method: "POST", body: JSON.stringify(this.state) })
      .then((payload) => ({ data: payload.data ?? null, error: payload.error ? new Error(payload.error.message) : null, count: payload.count ?? null }))
      .then(onfulfilled as any, onrejected as any);
  }
}

export const apiDb = { from: <T = unknown>(table: string) => new ApiQueryBuilder<T>(table) };
export const apiRpc = async <T = unknown>(fn: string, args?: Record<string, unknown>) => {
  const payload = await request<ApiEnvelope<T>>("rpc", { method: "POST", body: JSON.stringify({ fn, args: args ?? {} }) });
  return { data: payload.data ?? null, error: payload.error ? new Error(payload.error.message) : null };
};
