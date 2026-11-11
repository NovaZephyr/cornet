ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS moderation_reason text,
  ADD COLUMN IF NOT EXISTS moderation_suspended_until timestamptz,
  ADD COLUMN IF NOT EXISTS moderation_banned_until timestamptz,
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
END
$$;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_moderation_suspension_check,
  DROP CONSTRAINT IF EXISTS profiles_moderation_period_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_moderation_period_check CHECK (
    (moderation_status = 'suspended'
      AND moderation_suspended_until IS NOT NULL
      AND moderation_banned_until IS NULL)
    OR (moderation_status = 'banned'
      AND moderation_suspended_until IS NULL)
    OR (moderation_status IN ('active', 'warning')
      AND moderation_suspended_until IS NULL
      AND moderation_banned_until IS NULL)
  );

CREATE OR REPLACE FUNCTION public.is_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((
    SELECT CASE
      WHEN p.moderation_status = 'banned'
        THEN p.moderation_banned_until IS NULL OR p.moderation_banned_until > now()
      WHEN p.moderation_status = 'suspended'
        THEN p.moderation_suspended_until > now()
      ELSE p.is_banned
    END
    FROM public.profiles p
    WHERE p.id = _user_id
  ), false)
$$;

REVOKE ALL ON FUNCTION public.is_banned(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_banned(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_profile_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reactivation_rpc boolean := current_setting('app.cornet_reactivation', true) = 'on';
BEGIN
  IF NOT reactivation_rpc THEN
    IF NOT (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'moderator')
    ) AND (
      NEW.is_verified IS DISTINCT FROM OLD.is_verified
      OR NEW.is_banned IS DISTINCT FROM OLD.is_banned
      OR NEW.warnings_count IS DISTINCT FROM OLD.warnings_count
      OR NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
      OR NEW.moderation_reason IS DISTINCT FROM OLD.moderation_reason
      OR NEW.moderation_suspended_until IS DISTINCT FROM OLD.moderation_suspended_until
      OR NEW.moderation_banned_until IS DISTINCT FROM OLD.moderation_banned_until
      OR NEW.moderation_updated_at IS DISTINCT FROM OLD.moderation_updated_at
      OR NEW.moderation_updated_by IS DISTINCT FROM OLD.moderation_updated_by
    ) THEN
      RAISE EXCEPTION 'Solo el equipo de moderación puede cambiar el estado de moderación';
    END IF;

    IF auth.uid() IS NOT NULL AND public.is_banned(auth.uid()) THEN
      RAISE EXCEPTION 'Tu cuenta está restringida';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.moderate_account(
  _user_id uuid,
  _status text,
  _reason text DEFAULT NULL,
  _suspended_until timestamptz DEFAULT NULL,
  _banned_until timestamptz DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_is_admin boolean := public.has_role(auth.uid(), 'admin');
  actor_is_moderator boolean := public.has_role(auth.uid(), 'moderator');
  clean_reason text := nullif(btrim(coalesce(_reason, '')), '');
BEGIN
  IF NOT (actor_is_admin OR actor_is_moderator) THEN
    RAISE EXCEPTION 'Solo el equipo de moderación puede aplicar esta acción';
  END IF;
  IF _user_id IS NULL OR _user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes moderar tu propia cuenta';
  END IF;
  IF _status NOT IN ('active', 'warning', 'suspended', 'banned') THEN
    RAISE EXCEPTION 'Estado de moderación no válido';
  END IF;
  IF NOT actor_is_admin AND (
    public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'moderator')
  ) THEN
    RAISE EXCEPTION 'Los moderadores no pueden moderar cuentas del equipo';
  END IF;
  IF _status = 'suspended' AND (
    _suspended_until IS NULL
    OR _suspended_until <= now()
    OR _banned_until IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'La suspensión requiere una fecha futura obligatoria';
  END IF;
  IF _status = 'banned' AND (
    _suspended_until IS NOT NULL
    OR (_banned_until IS NOT NULL AND _banned_until <= now())
  ) THEN
    RAISE EXCEPTION 'La fecha de fin del baneo debe ser futura; déjala vacía para que sea permanente';
  END IF;
  IF _status IN ('active', 'warning') AND (
    _suspended_until IS NOT NULL OR _banned_until IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Esta acción no acepta una fecha de finalización';
  END IF;

  UPDATE public.profiles
  SET moderation_status = _status,
      moderation_reason = CASE WHEN _status = 'active' THEN NULL ELSE clean_reason END,
      moderation_suspended_until = CASE WHEN _status = 'suspended' THEN _suspended_until ELSE NULL END,
      moderation_banned_until = CASE WHEN _status = 'banned' THEN _banned_until ELSE NULL END,
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

REVOKE ALL ON FUNCTION public.moderate_account(uuid, text, text, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_account(uuid, text, text, timestamptz, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.reactivate_my_account()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.cornet_reactivation', 'on', true);

  UPDATE public.profiles
  SET moderation_status = 'active',
      moderation_reason = NULL,
      moderation_suspended_until = NULL,
      moderation_banned_until = NULL,
      moderation_updated_at = now(),
      moderation_updated_by = NULL,
      is_banned = false
  WHERE id = auth.uid()
    AND (
      moderation_status = 'warning'
      OR (
        moderation_status = 'suspended'
        AND moderation_suspended_until <= now()
      )
      OR (
        moderation_status = 'banned'
        AND moderation_banned_until IS NOT NULL
        AND moderation_banned_until <= now()
      )
    );

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.reactivate_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reactivate_my_account() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_user_role(
  _user_id uuid,
  _role public.app_role,
  _enabled boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo los administradores pueden cambiar roles';
  END IF;
  IF _user_id IS NULL OR _user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes cambiar tus propios roles';
  END IF;
  IF _role = 'user' THEN
    RAISE EXCEPTION 'El rol base de usuario no se puede modificar';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RAISE EXCEPTION 'El usuario no existe';
  END IF;

  IF _enabled THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    IF _role = 'admin' THEN
      PERFORM pg_advisory_xact_lock(20261111, 1);
      SELECT count(*) INTO admin_count
      FROM public.user_roles
      WHERE role = 'admin';
      IF admin_count <= 1 THEN
        RAISE EXCEPTION 'No puedes retirar el rol del último administrador';
      END IF;
    END IF;
    DELETE FROM public.user_roles
    WHERE user_id = _user_id AND role = _role;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role, boolean) TO authenticated;

DROP POLICY IF EXISTS "roles_read_own_or_admin" ON public.user_roles;
CREATE POLICY "roles_read_own_or_staff" ON public.user_roles
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);

DROP POLICY IF EXISTS "videos_owner_insert" ON public.videos;
CREATE POLICY "videos_owner_insert" ON public.videos
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND NOT public.is_banned(auth.uid())
);
