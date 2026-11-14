-- Keep Cloudflare RTMP credentials server-side only.
-- The live-stream Edge Function uses the service_role client for all secret access.
REVOKE ALL PRIVILEGES ON TABLE public.live_stream_secrets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.live_stream_secrets TO service_role;
DROP POLICY IF EXISTS live_stream_secrets_owner_read ON public.live_stream_secrets;

-- Public clients may discover live streams, but only the Edge Function may
-- create/delete streams or change provider/status/lifecycle fields.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.live_streams FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.live_streams TO anon, authenticated;
GRANT UPDATE (title, description) ON TABLE public.live_streams TO authenticated;

-- Ensure the intended row-level boundary remains in place.
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_secrets ENABLE ROW LEVEL SECURITY;
