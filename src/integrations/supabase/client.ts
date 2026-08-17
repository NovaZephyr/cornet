import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { apiDb, apiRpc } from '@/lib/api';

const SUPABASE_URL = "https://mvwpxnszcpyayofqgtmv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12d3B4bnN6Y3B5YXlvZnFndG12Iiwicm9sZCI6";

const nativeSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  }
});

/**
 * CoreNetwork data access facade.
 * - `.from()` and `.rpc()` are routed through the centralized API gateway.
 * - Auth, Realtime, Storage and Functions stay on the native Supabase client.
 */
export const supabase = new Proxy(nativeSupabase as any, {
  get(target, property, receiver) {
    if (property === 'from') return apiDb.from;
    if (property === 'rpc') return apiRpc;
    return Reflect.get(target, property, receiver);
  },
}) as typeof nativeSupabase;
