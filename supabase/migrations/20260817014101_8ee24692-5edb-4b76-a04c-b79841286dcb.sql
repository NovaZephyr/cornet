-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('warning','video_comment','post_comment','video_milestone','new_subscriber','video_like','new_video','partner_update','report_update','system')),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_video_idx ON public.notifications(video_id) WHERE video_id IS NOT NULL;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id AND read_at IS NOT NULL);
DROP POLICY IF EXISTS notifications_delete_own ON public.notifications;
CREATE POLICY notifications_delete_own ON public.notifications FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.create_notification(_user_id uuid, _type text, _title text, _body text DEFAULT '', _link text DEFAULT NULL, _actor_id uuid DEFAULT NULL, _video_id uuid DEFAULT NULL, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF _user_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.notifications(user_id,actor_id,type,title,body,link,video_id,metadata)
  VALUES (_user_id,_actor_id,_type,_title,coalesce(_body,''),_link,_video_id,coalesce(_metadata,'{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_notification(uuid,text,text,text,text,uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_warning() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN PERFORM public.create_notification(NEW.user_id,'warning','Has recibido una advertencia',NEW.reason,'/notifications',NEW.issued_by,NULL,jsonb_build_object('warning_id',NEW.id)); RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION public.notify_video_comment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ DECLARE owner_id uuid; BEGIN SELECT user_id INTO owner_id FROM public.videos WHERE id=NEW.video_id; IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN PERFORM public.create_notification(owner_id,'video_comment','Nuevo comentario en tu video',left(NEW.content,120),'/watch?v='||(SELECT code FROM public.videos WHERE id=NEW.video_id),NEW.user_id,NEW.video_id,jsonb_build_object('comment_id',NEW.id)); END IF; RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION public.notify_post_comment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ DECLARE owner_id uuid; BEGIN SELECT user_id INTO owner_id FROM public.community_posts WHERE id=NEW.post_id; IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN PERFORM public.create_notification(owner_id,'post_comment','Nuevo comentario en tu publicación',left(NEW.content,120),'/community',NEW.user_id,NULL,jsonb_build_object('post_id',NEW.post_id,'comment_id',NEW.id)); END IF; RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION public.notify_video_like() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ DECLARE owner_id uuid; BEGIN IF coalesce(NEW.is_like,true) IS NOT TRUE THEN RETURN NEW; END IF; SELECT user_id INTO owner_id FROM public.videos WHERE id=NEW.video_id; IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN PERFORM public.create_notification(owner_id,'video_like','A alguien le gustó tu video','Tu video recibió un Me gusta','/watch?v='||(SELECT code FROM public.videos WHERE id=NEW.video_id),NEW.user_id,NEW.video_id,jsonb_build_object('video_like',true)); END IF; RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION public.notify_new_subscriber() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ DECLARE name text; BEGIN IF NEW.subscriber_id=NEW.channel_id THEN RETURN NEW; END IF; SELECT coalesce(display_name,username) INTO name FROM public.profiles WHERE id=NEW.subscriber_id; PERFORM public.create_notification(NEW.channel_id,'new_subscriber','Nuevo suscriptor',coalesce(name,'Alguien')||' se suscribió a tu canal','/c/'||(SELECT username FROM public.profiles WHERE id=NEW.channel_id),NEW.subscriber_id,NULL,jsonb_build_object('subscriber_id',NEW.subscriber_id)); RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION public.notify_new_video_to_subscribers() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ DECLARE sub uuid; BEGIN IF NEW.visibility <> 'public' THEN RETURN NEW; END IF; FOR sub IN SELECT subscriber_id FROM public.subscriptions WHERE channel_id=NEW.user_id AND subscriber_id<>NEW.user_id LOOP PERFORM public.create_notification(sub,'new_video','Nuevo video de un canal que sigues',NEW.title,'/watch?v='||NEW.code,NEW.user_id,NEW.id,jsonb_build_object('video_id',NEW.id)); END LOOP; RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION public.notify_video_milestone() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN IF NEW.views=ANY(ARRAY[10,50,100,500,1000,5000,10000,50000,100000,500000,1000000]::bigint[]) AND NEW.views>OLD.views THEN PERFORM public.create_notification(NEW.user_id,'video_milestone','Tu video alcanzó '||NEW.views::text||' vistas',NEW.title,'/watch?v='||NEW.code,NULL,NEW.id,jsonb_build_object('milestone',NEW.views)); END IF; RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION public.notify_partner_update() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected') THEN PERFORM public.create_notification(NEW.user_id,'partner_update',CASE WHEN NEW.status='approved' THEN '¡Solicitud Partner aprobada!' ELSE 'Solicitud Partner rechazada' END,CASE WHEN NEW.status='approved' THEN 'Ya puedes disfrutar de las funciones Partner.' ELSE 'Tu solicitud de Partner fue rechazada.' END,'/partner',NULL,NULL,jsonb_build_object('status',NEW.status)); END IF; RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION public.notify_report_update() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('reviewed','dismissed','actioned') THEN PERFORM public.create_notification(NEW.reporter_id,'report_update','Actualización de tu denuncia','El estado de una denuncia que enviaste cambió a '||NEW.status||'.','/notifications',NEW.reviewed_by,NEW.video_id,jsonb_build_object('report_id',NEW.id,'status',NEW.status)); END IF; RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS user_warnings_notification ON public.user_warnings;
CREATE TRIGGER user_warnings_notification AFTER INSERT ON public.user_warnings FOR EACH ROW EXECUTE FUNCTION public.notify_warning();
DROP TRIGGER IF EXISTS comments_notification ON public.comments;
CREATE TRIGGER comments_notification AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.notify_video_comment();
DROP TRIGGER IF EXISTS community_post_comments_notification ON public.community_post_comments;
CREATE TRIGGER community_post_comments_notification AFTER INSERT ON public.community_post_comments FOR EACH ROW EXECUTE FUNCTION public.notify_post_comment();
DROP TRIGGER IF EXISTS video_likes_notification ON public.video_likes;
CREATE TRIGGER video_likes_notification AFTER INSERT ON public.video_likes FOR EACH ROW EXECUTE FUNCTION public.notify_video_like();
DROP TRIGGER IF EXISTS subscriptions_notification ON public.subscriptions;
CREATE TRIGGER subscriptions_notification AFTER INSERT ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.notify_new_subscriber();
DROP TRIGGER IF EXISTS videos_new_video_notification ON public.videos;
CREATE TRIGGER videos_new_video_notification AFTER INSERT ON public.videos FOR EACH ROW EXECUTE FUNCTION public.notify_new_video_to_subscribers();
DROP TRIGGER IF EXISTS videos_milestone_notification ON public.videos;
CREATE TRIGGER videos_milestone_notification AFTER UPDATE OF views ON public.videos FOR EACH ROW EXECUTE FUNCTION public.notify_video_milestone();
DROP TRIGGER IF EXISTS partner_application_notification ON public.partner_applications;
CREATE TRIGGER partner_application_notification AFTER UPDATE OF status ON public.partner_applications FOR EACH ROW EXECUTE FUNCTION public.notify_partner_update();
DROP TRIGGER IF EXISTS content_reports_notification ON public.content_reports;
CREATE TRIGGER content_reports_notification AFTER UPDATE OF status ON public.content_reports FOR EACH ROW EXECUTE FUNCTION public.notify_report_update();

-- Announcements (blog) and polls
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  image_path text,
  post_type text NOT NULL DEFAULT 'text' CHECK (post_type IN ('text','image','poll')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS announcements_public_read ON public.announcements;
CREATE POLICY announcements_public_read ON public.announcements FOR SELECT USING (true);
DROP POLICY IF EXISTS announcements_admin_write ON public.announcements;
CREATE POLICY announcements_admin_write ON public.announcements FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin') AND auth.uid() = author_id);

CREATE TABLE IF NOT EXISTS public.announcement_poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.announcement_poll_options TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_poll_options TO authenticated;
GRANT ALL ON public.announcement_poll_options TO service_role;
ALTER TABLE public.announcement_poll_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS poll_options_public_read ON public.announcement_poll_options;
CREATE POLICY poll_options_public_read ON public.announcement_poll_options FOR SELECT USING (true);
DROP POLICY IF EXISTS poll_options_admin_write ON public.announcement_poll_options;
CREATE POLICY poll_options_admin_write ON public.announcement_poll_options FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS poll_options_announcement_idx ON public.announcement_poll_options(announcement_id, position);

CREATE TABLE IF NOT EXISTS public.announcement_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.announcement_poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);
GRANT SELECT ON public.announcement_poll_votes TO anon;
GRANT SELECT, INSERT, DELETE ON public.announcement_poll_votes TO authenticated;
GRANT ALL ON public.announcement_poll_votes TO service_role;
ALTER TABLE public.announcement_poll_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS poll_votes_public_read ON public.announcement_poll_votes;
CREATE POLICY poll_votes_public_read ON public.announcement_poll_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS poll_votes_insert_own ON public.announcement_poll_votes;
CREATE POLICY poll_votes_insert_own ON public.announcement_poll_votes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));
DROP POLICY IF EXISTS poll_votes_delete_own ON public.announcement_poll_votes;
CREATE POLICY poll_votes_delete_own ON public.announcement_poll_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Global site banner (single row)
CREATE TABLE IF NOT EXISTS public.site_banner (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  message text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#cc0000',
  icon text,
  dismissible boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_banner TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_banner TO authenticated;
GRANT ALL ON public.site_banner TO service_role;
ALTER TABLE public.site_banner ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS site_banner_public_read ON public.site_banner;
CREATE POLICY site_banner_public_read ON public.site_banner FOR SELECT USING (true);
DROP POLICY IF EXISTS site_banner_admin_write ON public.site_banner;
CREATE POLICY site_banner_admin_write ON public.site_banner FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.site_banner (id) VALUES (true) ON CONFLICT (id) DO NOTHING;