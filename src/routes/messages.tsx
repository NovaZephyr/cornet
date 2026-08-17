import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, Circle, MessageCircle, MoreVertical, Plus, Search, Send, UserMinus, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { ChannelAvatar } from "@/components/Media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  description?: string | null;
  avatar_path?: string | null;
  is_verified?: boolean;
};

type FriendRequest = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  created_at: string;
};

type Conversation = {
  id: string;
  kind: "dm" | "group";
  name: string | null;
  owner_id: string | null;
  updated_at: string;
  last_message_at: string | null;
};

type Member = {
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
  nickname: string | null;
};

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

const db = supabase as any;

function profileLabel(profile?: Profile | null) {
  return profile?.display_name?.trim() || profile?.username || "Usuario";
}

function formatTime(date: string) {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

async function getProfiles(ids: string[]) {
  if (!ids.length) return [] as Profile[];
  const { data, error } = await db.from("profiles").select("id,username,display_name,description,avatar_path,is_verified").in("id", ids);
  if (error) throw error;
  return (data ?? []) as Profile[];
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="flex h-full min-h-[360px] flex-col items-center justify-center px-6 text-center text-muted-foreground"><MessageCircle className="mb-4 h-12 w-12 opacity-30" /><h2 className="text-lg font-semibold text-foreground">{title}</h2><p className="mt-1 max-w-md text-sm">{text}</p></div>;
}

function UserRow({ profile, action }: { profile: Profile; action?: ReactNode }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/60 p-3"><ChannelAvatar path={profile.avatar_path} name={profileLabel(profile)} size={42} /><div className="min-w-0 flex-1"><div className="flex items-center gap-1"><p className="truncate font-medium">{profileLabel(profile)}</p>{profile.is_verified && <Badge className="h-5 px-1.5 text-[10px]">✓</Badge>}</div><p className="truncate text-xs text-muted-foreground">@{profile.username}</p></div>{action}</div>;
}

export function MessagesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState<"messages" | "friends">("messages");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [friendSearch, setFriendSearch] = useState("");
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupFriends, setSelectedGroupFriends] = useState<string[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  const friendsQuery = useQuery({
    queryKey: ["cornet-friends", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db.from("friendships").select("id,user_a,user_b,created_at").or(`user_a.eq.${user!.id},user_b.eq.${user!.id}`).order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (data ?? []).map((row: any) => row.user_a === user!.id ? row.user_b : row.user_a);
      return getProfiles(ids);
    },
  });

  const incomingRequestsQuery = useQuery({
    queryKey: ["cornet-friend-requests-in", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db.from("friend_requests").select("id,requester_id,recipient_id,status,created_at").eq("recipient_id", user!.id).eq("status", "pending").order("created_at", { ascending: false });
      if (error) throw error;
      const requests = (data ?? []) as FriendRequest[];
      const profiles = await getProfiles(requests.map((r) => r.requester_id));
      const byId = new Map(profiles.map((p) => [p.id, p]));
      return requests.map((request) => ({ ...request, profile: byId.get(request.requester_id) })).filter((r) => r.profile) as (FriendRequest & { profile: Profile })[];
    },
  });

  const outgoingRequestsQuery = useQuery({
    queryKey: ["cornet-friend-requests-out", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db.from("friend_requests").select("id,requester_id,recipient_id,status,created_at").eq("requester_id", user!.id).eq("status", "pending").order("created_at", { ascending: false });
      if (error) throw error;
      const requests = (data ?? []) as FriendRequest[];
      const profiles = await getProfiles(requests.map((r) => r.recipient_id));
      const byId = new Map(profiles.map((p) => [p.id, p]));
      return requests.map((request) => ({ ...request, profile: byId.get(request.recipient_id) })).filter((r) => r.profile) as (FriendRequest & { profile: Profile })[];
    },
  });

  const conversationsQuery = useQuery({
    queryKey: ["cornet-conversations", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data: membershipRows, error: membershipError } = await db.from("message_conversation_members").select("conversation_id,user_id,last_read_at,nickname").eq("user_id", user!.id);
      if (membershipError) throw membershipError;
      const ids = ((membershipRows ?? []) as Member[]).map((m) => m.conversation_id);
      if (!ids.length) return [] as Array<Conversation & { members: Profile[] }>;
      const [{ data: conversations, error: conversationError }, { data: allMembers, error: membersError }] = await Promise.all([
        db.from("message_conversations").select("id,kind,name,owner_id,updated_at,last_message_at").in("id", ids).order("updated_at", { ascending: false }),
        db.from("message_conversation_members").select("conversation_id,user_id,last_read_at,nickname").in("conversation_id", ids),
      ]);
      if (conversationError) throw conversationError;
      if (membersError) throw membersError;
      const memberList = (allMembers ?? []) as Member[];
      const profileList = await getProfiles([...new Set(memberList.map((m) => m.user_id))]);
      const profileMap = new Map(profileList.map((p) => [p.id, p]));
      return ((conversations ?? []) as Conversation[]).map((conversation) => ({
        ...conversation,
        members: memberList.filter((m) => m.conversation_id === conversation.id).map((m) => profileMap.get(m.user_id)).filter(Boolean) as Profile[],
      }));
    },
  });

  const selectedChat = conversationsQuery.data?.find((conversation) => conversation.id === selectedConversation) ?? null;
  const selectedMemberProfiles = selectedChat?.members.filter((profile) => profile.id !== user?.id) ?? [];

  const messagesQuery = useQuery({
    queryKey: ["cornet-messages", selectedConversation], enabled: !!selectedConversation && !!user,
    queryFn: async () => {
      const { data, error } = await db.from("messages").select("id,conversation_id,sender_id,content,created_at,edited_at,deleted_at").eq("conversation_id", selectedConversation).order("created_at", { ascending: true }).limit(200);
      if (error) throw error;
      return (data ?? []) as ChatMessage[];
    },
  });

  const usersSearchQuery = useQuery({
    queryKey: ["cornet-user-search", search], enabled: search.trim().length >= 2 && !!user,
    queryFn: async () => {
      const term = search.trim().toLowerCase();
      const { data, error } = await db.from("profiles").select("id,username,display_name,description,avatar_path,is_verified").or(`username.ilike.%${term}%,display_name.ilike.%${term}%`).neq("id", user!.id).limit(20);
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const filteredFriends = useMemo(() => {
    const term = friendSearch.trim().toLowerCase();
    if (!term) return friendsQuery.data ?? [];
    return (friendsQuery.data ?? []).filter((friend) => friend.username.includes(term) || profileLabel(friend).toLowerCase().includes(term));
  }, [friendSearch, friendsQuery.data]);

  const currentConversationTitle = selectedChat?.kind === "group" ? selectedChat.name || "Grupo" : profileLabel(selectedMemberProfiles[0]) || "Mensaje directo";

  useEffect(() => {
    if (!user) return;
    const presence = supabase.channel("cornet-presence", { config: { presence: { key: user.id } } });
    presence.on("presence", { event: "sync" }, () => {
      const state = presence.presenceState() as Record<string, Array<{ user_id?: string }>>;
      const ids = new Set<string>();
      Object.values(state).forEach((entries) => entries.forEach((entry) => { if (entry.user_id) ids.add(entry.user_id); }));
      setOnlineIds(ids);
    }).on("presence", { event: "join" }, ({ key }) => setOnlineIds((prev) => new Set([...prev, key]))).on("presence", { event: "leave" }, ({ key }) => setOnlineIds((prev) => { const next = new Set(prev); next.delete(key); return next; })).subscribe(async (status) => {
      if (status === "SUBSCRIBED") await presence.track({ user_id: user.id, online_at: new Date().toISOString() });
    });
    return () => { void supabase.removeChannel(presence); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const requestChannel = supabase.channel(`cornet-friend-requests:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests", filter: `recipient_id=eq.${user.id}` }, () => void qc.invalidateQueries({ queryKey: ["cornet-friend-requests-in", user.id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests", filter: `requester_id=eq.${user.id}` }, () => void qc.invalidateQueries({ queryKey: ["cornet-friend-requests-out", user.id] }))
      .subscribe();
    return () => { void supabase.removeChannel(requestChannel); };
  }, [qc, user]);

  useEffect(() => {
    if (!selectedConversation || !user) return;
    const channel = supabase.channel(`cornet-messages:${selectedConversation}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConversation}` }, (payload) => {
        qc.setQueryData<ChatMessage[]>(["cornet-messages", selectedConversation], (current) => [...(current ?? []), payload.new as ChatMessage]);
        void db.from("message_conversation_members").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", selectedConversation).eq("user_id", user.id);
        void qc.invalidateQueries({ queryKey: ["cornet-conversations", user.id] });
      })
      .subscribe();
    void db.from("message_conversation_members").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", selectedConversation).eq("user_id", user.id);
    return () => { void supabase.removeChannel(channel); };
  }, [qc, selectedConversation, user]);

  if (!user) return <Card className="mx-auto max-w-5xl"><EmptyState title="Inicia sesión para usar Cornet Messenger" text="Agrega amigos, abre conversaciones y habla con otras personas de Cornet en tiempo real." /></Card>;

  const sendFriendRequest = async (profile: Profile) => {
    const { data: reverse } = await db.from("friend_requests").select("id").eq("requester_id", profile.id).eq("recipient_id", user.id).eq("status", "pending").maybeSingle();
    if (reverse) {
      const [userA, userB] = [user.id, profile.id].sort();
      const { error: friendshipError } = await db.from("friendships").insert({ user_a: userA, user_b: userB });
      if (friendshipError && !String(friendshipError.message).toLowerCase().includes("duplicate")) throw friendshipError;
      await db.from("friend_requests").update({ status: "accepted", responded_at: new Date().toISOString() }).eq("id", reverse.id);
      toast.success(`Ahora tú y @${profile.username} son amigos`);
    } else {
      const { data: existing } = await db.from("friendships").select("id").or(`and(user_a.eq.${user.id},user_b.eq.${profile.id}),and(user_a.eq.${profile.id},user_b.eq.${user.id})`).maybeSingle();
      if (existing) return toast.info("Ya son amigos.");
      const { data: oldRequest } = await db.from("friend_requests").select("id,status").eq("requester_id", user.id).eq("recipient_id", profile.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (oldRequest?.status === "pending") return toast.info("La solicitud ya está pendiente.");
      const { error } = await db.from("friend_requests").insert({ requester_id: user.id, recipient_id: profile.id });
      if (error) throw error;
      toast.success(`Solicitud enviada a @${profile.username}`);
    }
    await qc.invalidateQueries({ queryKey: ["cornet-friend-requests-in", user.id] });
    await qc.invalidateQueries({ queryKey: ["cornet-friend-requests-out", user.id] });
    await qc.invalidateQueries({ queryKey: ["cornet-friends", user.id] });
  };

  const respondFriendRequest = async (request: FriendRequest, accept: boolean) => {
    if (accept) {
      const [userA, userB] = [user.id, request.requester_id].sort();
      const { error: friendshipError } = await db.from("friendships").insert({ user_a: userA, user_b: userB });
      if (friendshipError && !String(friendshipError.message).toLowerCase().includes("duplicate")) throw friendshipError;
    }
    const { error } = await db.from("friend_requests").update({ status: accept ? "accepted" : "declined", responded_at: new Date().toISOString() }).eq("id", request.id).eq("recipient_id", user.id);
    if (error) throw error;
    toast.success(accept ? "Solicitud aceptada" : "Solicitud rechazada");
    await qc.invalidateQueries({ queryKey: ["cornet-friend-requests-in", user.id] });
    await qc.invalidateQueries({ queryKey: ["cornet-friends", user.id] });
  };

  const removeFriend = async (friendId: string) => {
    const [userA, userB] = [user.id, friendId].sort();
    const { error } = await db.from("friendships").delete().eq("user_a", userA).eq("user_b", userB);
    if (error) throw error;
    toast.success("Amigo eliminado");
    await qc.invalidateQueries({ queryKey: ["cornet-friends", user.id] });
  };

  const openDm = async (friend: Profile) => {
    const { data: myMemberships, error: myError } = await db.from("message_conversation_members").select("conversation_id").eq("user_id", user.id);
    if (myError) throw myError;
    const ids = (myMemberships ?? []).map((m: any) => m.conversation_id);
    if (ids.length) {
      const { data: common, error: commonError } = await db.from("message_conversation_members").select("conversation_id").in("conversation_id", ids).eq("user_id", friend.id);
      if (commonError) throw commonError;
      if (common?.length) {
        const { data: dmCandidates } = await db.from("message_conversations").select("id,kind").in("id", common.map((m: any) => m.conversation_id)).eq("kind", "dm");
        if (dmCandidates?.[0]) {
          setSelectedConversation(dmCandidates[0].id);
          setActiveSection("messages");
          return;
        }
      }
    }
    const { data: conversation, error: conversationError } = await db.from("message_conversations").insert({ kind: "dm", owner_id: null }).select("id").single();
    if (conversationError) throw conversationError;
    const { error: membersError } = await db.from("message_conversation_members").insert([{ conversation_id: conversation.id, user_id: user.id }, { conversation_id: conversation.id, user_id: friend.id }]);
    if (membersError) throw membersError;
    setSelectedConversation(conversation.id);
    setActiveSection("messages");
    await qc.invalidateQueries({ queryKey: ["cornet-conversations", user.id] });
  };

  const createGroup = async () => {
    const name = groupName.trim();
    if (!name) return toast.error("Ponle un nombre al grupo.");
    if (!selectedGroupFriends.length) return toast.error("Selecciona al menos un amigo.");
    const { data: conversation, error } = await db.from("message_conversations").insert({ kind: "group", name, owner_id: user.id }).select("id").single();
    if (error) throw error;
    const rows = [user.id, ...selectedGroupFriends].map((id) => ({ conversation_id: conversation.id, user_id: id }));
    const { error: membersError } = await db.from("message_conversation_members").insert(rows);
    if (membersError) throw membersError;
    setSelectedConversation(conversation.id);
    setGroupName("");
    setSelectedGroupFriends([]);
    setGroupOpen(false);
    setActiveSection("messages");
    await qc.invalidateQueries({ queryKey: ["cornet-conversations", user.id] });
    toast.success("Grupo creado");
  };

  const sendMessage = async () => {
    const content = messageText.trim();
    if (!selectedConversation || !content) return;
    const { error } = await db.from("messages").insert({ conversation_id: selectedConversation, sender_id: user.id, content });
    if (error) throw error;
    setMessageText("");
  };

  const otherPeople = selectedChat?.kind === "group" ? selectedMemberProfiles : selectedMemberProfiles.slice(0, 1);

  return <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 lg:px-6">
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><MessageCircle className="h-6 w-6 text-primary" /><h1 className="text-2xl font-bold">Cornet Messenger</h1><Badge variant="secondary">Realtime</Badge></div><p className="mt-1 text-sm text-muted-foreground">Mensajería estilo OldCord, con amigos al estilo de las redes clásicas.</p></div><div className="flex gap-2"><Button variant={activeSection === "messages" ? "default" : "outline"} onClick={() => setActiveSection("messages")}><MessageCircle className="mr-2 h-4 w-4" />Mensajes</Button><Button variant={activeSection === "friends" ? "default" : "outline"} onClick={() => setActiveSection("friends")}><Users className="mr-2 h-4 w-4" />Amigos{incomingRequestsQuery.data?.length ? <Badge className="ml-2 h-5 min-w-5 justify-center px-1.5 text-[10px]">{incomingRequestsQuery.data.length}</Badge> : null}</Button></div></div>
    {activeSection === "friends" ? <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <Card className="border-border/70 bg-background/75 p-4"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-semibold">Mis amigos</h2><p className="text-xs text-muted-foreground">Conexiones directas, como en VidLii.</p></div><div className="relative w-64 max-w-full"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={friendSearch} onChange={(event) => setFriendSearch(event.target.value)} placeholder="Filtrar amigos…" className="pl-9" /></div></div><div className="grid gap-2 sm:grid-cols-2">{filteredFriends.map((friend) => <UserRow key={friend.id} profile={friend} action={<div className="flex gap-1"><Button size="icon" variant="ghost" title="Mensaje" onClick={() => void openDm(friend)}><MessageCircle className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Eliminar amigo" onClick={() => void removeFriend(friend.id)}><UserMinus className="h-4 w-4" /></Button></div>} />)}{!friendsQuery.isLoading && !filteredFriends.length && <div className="col-span-full py-12 text-center text-sm text-muted-foreground">Todavía no tienes amigos agregados.</div>}</div></Card>
      <div className="space-y-4"><Card className="border-border/70 bg-background/75 p-4"><h2 className="mb-3 font-semibold">Solicitudes recibidas</h2><div className="space-y-2">{incomingRequestsQuery.data?.map((request) => <UserRow key={request.id} profile={request.profile} action={<div className="flex gap-1"><Button size="icon" title="Aceptar" onClick={() => void respondFriendRequest(request, true)}><Check className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Rechazar" onClick={() => void respondFriendRequest(request, false)}><X className="h-4 w-4" /></Button></div>} />)}{!incomingRequestsQuery.data?.length && <p className="py-8 text-center text-sm text-muted-foreground">Sin solicitudes nuevas.</p>}</div></Card><Card className="border-border/70 bg-background/75 p-4"><h2 className="mb-3 font-semibold">Solicitudes enviadas</h2><div className="space-y-2">{outgoingRequestsQuery.data?.map((request) => <UserRow key={request.id} profile={request.profile} action={<Badge variant="secondary">Pendiente</Badge>} />)}{!outgoingRequestsQuery.data?.length && <p className="py-8 text-center text-sm text-muted-foreground">No tienes solicitudes pendientes.</p>}</div></Card></div>
      <Card className="border-border/70 bg-background/75 p-4 lg:col-span-2"><div className="mb-3 flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">Encontrar personas</h2><p className="text-xs text-muted-foreground">Busca por nombre visible o @usuario.</p></div></div><div className="relative mb-4 max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Busca @usuario…" className="pl-9" /></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{usersSearchQuery.data?.map((profile) => <UserRow key={profile.id} profile={profile} action={<Button size="sm" onClick={() => void sendFriendRequest(profile)}><UserPlus className="mr-2 h-4 w-4" />Añadir</Button>} />)}{search.length >= 2 && !usersSearchQuery.isLoading && !usersSearchQuery.data?.length && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No encontramos usuarios.</p>}</div></Card>
    </div> : <div className="grid min-h-[72vh] overflow-hidden rounded-3xl border border-border/70 bg-[#171922] text-white shadow-2xl lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-white/5 bg-[#101116] lg:border-b-0 lg:border-r"><div className="border-b border-white/5 p-3"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar conversaciones o personas" className="border-0 bg-white/5 pl-9 text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-white/10" /></div></div><div className="flex items-center justify-between px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40"><span>Mensajes directos</span><Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:bg-white/5 hover:text-white" onClick={() => setActiveSection("friends")}><UserPlus className="h-4 w-4" /></Button></div><div className="space-y-1 px-2 pb-3">{conversationsQuery.data?.map((conversation) => { const people = conversation.members.filter((p) => p.id !== user.id); const title = conversation.kind === "group" ? conversation.name || "Grupo" : profileLabel(people[0]); const active = selectedConversation === conversation.id; return <button key={conversation.id} type="button" onClick={() => setSelectedConversation(conversation.id)} className={cn("flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition", active ? "bg-white/10" : "hover:bg-white/5")}><div className="relative">{conversation.kind === "group" ? <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20"><Users className="h-5 w-5 text-indigo-300" /></div> : <ChannelAvatar path={people[0]?.avatar_path} name={profileLabel(people[0])} size={40} />}{conversation.kind === "dm" && people[0] && <Circle className={cn("absolute bottom-0 right-0 h-3 w-3 fill-current stroke-[3]", onlineIds.has(people[0].id) ? "text-emerald-400" : "text-zinc-600")} />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white/90">{title}</p><p className="truncate text-xs text-white/35">{conversation.kind === "group" ? `${Math.max(0, conversation.members.length)} miembros` : (onlineIds.has(people[0]?.id ?? "") ? "En línea" : "Sin conexión")}</p></div></button>; })}</div><div className="border-t border-white/5 p-3"><Dialog open={groupOpen} onOpenChange={setGroupOpen}><DialogTrigger asChild><Button className="w-full bg-indigo-600 hover:bg-indigo-500"><Plus className="mr-2 h-4 w-4" />Nuevo grupo</Button></DialogTrigger><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Crear grupo</DialogTitle></DialogHeader><div className="space-y-4"><Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Nombre del grupo" /><div className="max-h-72 space-y-2 overflow-y-auto">{(friendsQuery.data ?? []).map((friend) => <label key={friend.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3"><Checkbox checked={selectedGroupFriends.includes(friend.id)} onCheckedChange={(checked) => setSelectedGroupFriends((current) => checked ? [...current, friend.id] : current.filter((id) => id !== friend.id))} /><ChannelAvatar path={friend.avatar_path} name={profileLabel(friend)} size={34} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{profileLabel(friend)}</span><span className="block text-xs text-muted-foreground">@{friend.username}</span></span></label>)}{!friendsQuery.data?.length && <p className="py-8 text-center text-sm text-muted-foreground">Agrega amigos primero para crear un grupo.</p>}</div><Button onClick={() => void createGroup()} disabled={!groupName.trim() || !selectedGroupFriends.length}><Users className="mr-2 h-4 w-4" />Crear grupo</Button></div></DialogContent></Dialog></div></aside>
      <section className="flex min-h-0 flex-col bg-[#1e1f2a]">{!selectedConversation ? <EmptyState title="Tus mensajes están aquí" text="Elige una conversación de la izquierda o ve a Amigos para comenzar una nueva." /> : <><header className="flex items-center gap-3 border-b border-white/5 bg-[#20212d] px-4 py-3"><Button variant="ghost" size="icon" className="lg:hidden text-white/70" onClick={() => setSelectedConversation(null)}><ChevronLeft className="h-5 w-5" /></Button><div className="relative">{selectedChat?.kind === "group" ? <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20"><Users className="h-5 w-5 text-indigo-300" /></div> : <ChannelAvatar path={otherPeople[0]?.avatar_path} name={currentConversationTitle} size={40} />}{selectedChat?.kind === "dm" && <Circle className={cn("absolute bottom-0 right-0 h-3 w-3 fill-current stroke-[3]", onlineIds.has(otherPeople[0]?.id ?? "") ? "text-emerald-400" : "text-zinc-600")} />}</div><div className="min-w-0 flex-1"><h2 className="truncate font-semibold text-white">{currentConversationTitle}</h2><p className="truncate text-xs text-white/40">{selectedChat?.kind === "group" ? `${selectedChat.members.length} miembros` : onlineIds.has(otherPeople[0]?.id ?? "") ? "En línea" : "Fuera de línea"}</p></div><Button variant="ghost" size="icon" className="text-white/50 hover:bg-white/5 hover:text-white"><MoreVertical className="h-5 w-5" /></Button></header><div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">{messagesQuery.data?.length ? messagesQuery.data.map((message, index) => { const sender = selectedChat?.members.find((p) => p.id === message.sender_id); const previous = messagesQuery.data?.[index - 1]; const grouped = previous?.sender_id === message.sender_id && new Date(message.created_at).getTime() - new Date(previous.created_at).getTime() < 5 * 60 * 1000; return <div key={message.id} className={cn("group flex gap-3", grouped && "mt-[-10px]")}><div className="w-10 shrink-0 pt-0.5">{!grouped && <ChannelAvatar path={sender?.avatar_path} name={profileLabel(sender)} size={36} />}</div><div className="min-w-0 flex-1"><div className="flex items-baseline gap-2">{!grouped && <span className="font-semibold text-white">{profileLabel(sender)}</span>}{!grouped && <span className="text-[10px] text-white/30">{formatTime(message.created_at)}</span>}{grouped && <span className="invisible text-[10px] text-white/30 group-hover:visible">{formatTime(message.created_at)}</span>}</div><p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/85">{message.deleted_at ? <span className="italic text-white/30">Mensaje eliminado</span> : message.content}</p></div></div>; }) : <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center"><MessageCircle className="mb-4 h-12 w-12 text-white/15" /><p className="font-semibold text-white">Este es el principio de tu conversación.</p><p className="mt-1 max-w-md text-sm text-white/35">Escribe algo para empezar a hablar.</p></div>}</div><div className="border-t border-white/5 bg-[#20212d] p-3 sm:p-4"><form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); void sendMessage(); }}><Textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder={`Enviar mensaje a ${currentConversationTitle}`} className="min-h-11 resize-none border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-indigo-500" rows={1} /><Button type="submit" disabled={!messageText.trim()} className="h-11 bg-indigo-600 hover:bg-indigo-500"><Send className="h-4 w-4" /></Button></form><p className="mt-1 px-1 text-[10px] text-white/25">Enter para enviar · Shift+Enter para salto de línea</p></div></>}</section>
    </div>}
  </div>;
}

export const Route = createFileRoute("/messages")({ component: MessagesPage });
export default MessagesPage;
