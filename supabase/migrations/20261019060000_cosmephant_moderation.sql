ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS moderation_reason text,
  ADD COLUMN IF NOT EXISTS moderation_suspended_until timestamptz,
  ADD COLUMN IF NOT EXISTS moderation_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderation_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.profiles
SET moderation_status = 'banned'
WHERE is_banned IS TRUE
  AND moderation_status = 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_moderation_status_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_moderation_status_check
      CHECK (moderation_status IN ('active', 'warning', 'suspended', 'banned'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_moderation_suspension_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_moderation_suspension_check
      CHECK (
        (moderation_status = 'suspended' AND moderation_suspended_until IS NOT NULL)
        OR (moderation_status <> 'suspended' AND moderation_suspended_until IS NULL)
      );
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.enforce_profile_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  reactivation_rpc boolean := current_setting('app.cornet_reactivation', true) = 'on';
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    IF NOT reactivation_rpc AND (
       NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.is_banned IS DISTINCT FROM OLD.is_banned
       OR NEW.warnings_count IS DISTINCT FROM OLD.warnings_count
       OR NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
       OR NEW.moderation_reason IS DISTINCT FROM OLD.moderation_reason
       OR NEW.moderation_suspended_until IS DISTINCT FROM OLD.moderation_suspended_until
       OR NEW.moderation_updated_at IS DISTINCT FROM OLD.moderation_updated_at
       OR NEW.moderation_updated_by IS DISTINCT FROM OLD.moderation_updated_by
    ) THEN
      RAISE EXCEPTION 'Solo el equipo de moderación puede cambiar el estado de moderación';
    END IF;
  END IF;
  IF auth.uid() IS NOT NULL AND public.is_banned(auth.uid()) AND NOT reactivation_rpc THEN
    RAISE EXCEPTION 'Tu cuenta está suspendida';
  END IF;
  RETURN NEW;
END;
$;

CREATE OR REPLACE FUNCTION public.moderate_account(
  _user_id uuid,
  _status text,
  _reason text DEFAULT NULL,
  _duration_hours integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_reason text := nullif(btrim(coalesce(_reason, '')), '');
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Solo el equipo de moderación puede aplicar esta acción';
  END IF;
  IF _user_id IS NULL OR _user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes moderar tu propia cuenta';
  END IF;
  IF _status NOT IN ('active', 'warning', 'suspended', 'banned') THEN
    RAISE EXCEPTION 'Estado de moderación no válido';
  END IF;
  IF _status = 'suspended' AND coalesce(_duration_hours, 0) NOT BETWEEN 1 AND 8760 THEN
    RAISE EXCEPTION 'La suspensión debe durar entre 1 y 8760 horas';
  END IF;

  UPDATE public.profiles
  SET moderation_status = _status,
      moderation_reason = CASE WHEN _status = 'active' THEN NULL ELSE clean_reason END,
      moderation_suspended_until = CASE
        WHEN _status = 'suspended' THEN now() + make_interval(hours => _duration_hours)
        ELSE NULL
      END,
      moderation_updated_at = now(),
      moderation_updated_by = auth.uid(),
      is_banned = (_status = 'banned'),
      warnings_count = warnings_count + CASE WHEN _status = 'warning' THEN 1 ELSE 0 END
  WHERE id = _user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF _status = 'warning' THEN
    INSERT INTO public.user_warnings (user_id, reason, issued_by)
    VALUES (_user_id, coalesce(clean_reason, 'Advertencia de moderación'), auth.uid());
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_account(uuid, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_account(uuid, text, text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.reactivate_my_account()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  PERFORM set_config('app.cornet_reactivation', 'on', true);
  UPDATE public.profiles
  SET moderation_status = 'active',
      moderation_reason = NULL,
      moderation_suspended_until = NULL,
      moderation_updated_at = now(),
      moderation_updated_by = NULL,
      is_banned = false
  WHERE id = auth.uid()
    AND is_banned IS NOT TRUE
    AND (
      moderation_status = 'warning'
      OR (
        moderation_status = 'suspended'
        AND moderation_suspended_until <= now()
      )
    );

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.reactivate_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reactivate_my_account() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((
    SELECT p.is_banned OR p.moderation_status IN ('suspended', 'banned')
    FROM public.profiles p
    WHERE p.id = _user_id
  ), false)
$$;

REVOKE ALL ON FUNCTION public.is_banned(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_banned(uuid) TO anon, authenticated;
