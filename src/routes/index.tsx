import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { VideoCard } from "@/components/VideoCard";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <AppShell><div>Home</div></AppShell>;
}
