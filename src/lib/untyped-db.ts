import { supabase } from "@/integrations/supabase/client";

/**
 * Escape hatch for tables/RPCs that live in the project's Supabase instance but
 * are not present in the generated `types.ts` (e.g. campaign/ads tables added
 * outside the type generation cycle). Runtime behaviour is identical to the
 * typed client; only the compile-time types are relaxed.
 */
export const untypedDb = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};
