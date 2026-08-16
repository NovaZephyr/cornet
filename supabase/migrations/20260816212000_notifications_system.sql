-- Mirrors the notifications_system migration applied to the connected CoreNetwork Supabase project.
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
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_video_idx ON public.notifications(video_id) WHERE video_id IS NOT NULL;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_select_own ON public.notifications FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id AND read_at IS NOT NULL);
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
CREATE OR REPLACE FUNCTION public.notify_report_update() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('reviewed','dismissed','actioned') THEN PERFORM public.create_notification(NEW.reporter_id,'report_update','Actualización de tu denuncia','El estado de una denuncia que enviaste cambió a '||NEW.status||.'.','/notifications',NEW.reviewed_by,NEW.video_id,jsonb_build_object('report_id',NEW.id,'status',NEW.status)); END IF; RETURN NEW; END; $$;

CREATE TRIGGER user_warnings_notification AFTER INSERT ON public.user_warnings FOR EACH ROW EXECUTE FUNCTION public.notify_warning();
CREATE TRIGGER comments_notification AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.notify_video_comment();
CREATE TRIGGER community_post_comments_notification AFTER INSERT ON public.community_post_comments FOR EACH ROW EXECUTE FUNCTION public.notify_post_comment();
CREATE TRIGGER video_likes_notification AFTER INSERT ON public.video_likes FOR EACH ROW EXECUTE FUNCTION public.notify_video_like();
CREATE TRIGGER subscriptions_notification AFTER INSERT ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.notify_new_subscriber();
CREATE TRIGGER videos_new_video_notification AFTER INSERT ON public.videos FOR EACH ROW EXECUTE FUNCTION public.notify_new_video_to_subscribers();
CREATE TRIGGER videos_milestone_notification AFTER UPDATE OF views ON public.videos FOR EACH ROW EXECUTE FUNCTION public.notify_video_milestone();
CREATE TRIGGER partner_application_notification AFTER UPDATE OF status ON public.partner_applications FOR EACH ROW EXECUTE FUNCTION public.notify_partner_update();
CREATE TRIGGER content_reports_notification AFTER UPDATE OF status ON public.content_reports FOR EACH ROW EXECUTE FUNCTION public.notify_report_update();