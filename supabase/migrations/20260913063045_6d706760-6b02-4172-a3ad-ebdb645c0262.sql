CREATE OR REPLACE FUNCTION public.notify_mentions_as_user(actor_id uuid, content text, link text, title text, body text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  real_actor uuid := auth.uid();
  username_match text;
  target_user_id uuid;
  created_count integer := 0;
  already_notified boolean;
begin
  if real_actor is null then return 0; end if;
  for username_match in
    select distinct lower((m)[1]) from regexp_matches(coalesce(content,''), '@([A-Za-z0-9_][A-Za-z0-9_.-]{0,31})', 'g') as m
  loop
    select id into target_user_id from public.profiles where lower(username)=username_match and account_status <> 'pending_deletion' limit 1;
    if target_user_id is not null and target_user_id <> real_actor then
      select exists(select 1 from public.notifications n where n.user_id=target_user_id and n.actor_id=real_actor and n.type='mention' and n.link is not distinct from link and (n.metadata->>'mentioned_username')=username_match and n.created_at > now()-interval '15 seconds') into already_notified;
      if not already_notified then
        insert into public.notifications(user_id,actor_id,type,title,body,link,metadata)
        values(target_user_id,real_actor,'mention',title,body,link,jsonb_build_object('mention',true,'mentioned_username',username_match));
        created_count := created_count + 1;
      end if;
    end if;
  end loop;
  return created_count;
end;
$function$;