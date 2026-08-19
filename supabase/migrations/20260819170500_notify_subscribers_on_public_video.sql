create or replace function public.notify_subscribers_on_public_video()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  subscriber uuid;
begin
  if new.visibility is distinct from 'public' then
    return new;
  end if;

  for subscriber in
    select subscriber_id
    from public.subscriptions
    where channel_id = new.user_id
      and subscriber_id <> new.user_id
  loop
    insert into public.notifications (user_id, actor_id, type, title, body, link, video_id, metadata)
    values (
      subscriber,
      new.user_id,
      'new_video',
      'Nuevo video de tu suscripción',
      new.title,
      '/watch?v=' || new.code,
      new.id,
      jsonb_build_object('video_code', new.code, 'channel_id', new.user_id)
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_notify_subscribers_on_public_video on public.videos;
create trigger trg_notify_subscribers_on_public_video
after insert on public.videos
for each row execute function public.notify_subscribers_on_public_video();

revoke execute on function public.notify_subscribers_on_public_video() from anon, authenticated;
