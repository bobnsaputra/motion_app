-- ============================================================================
-- USAGE-BASED TIMER MIGRATION
-- Tracks actual seconds of usage for free users. 24 hours (86400s) limit.
-- ============================================================================

-- 1. Add usage_seconds_used column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS usage_seconds_used integer DEFAULT 0 NOT NULL;

-- 2. Update the RLS "safe fields" policy to also protect usage_seconds_used
DROP POLICY IF EXISTS "Users can update own safe fields" ON public.profiles;

CREATE POLICY "Users can update own safe fields"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    subscription_status IS NOT DISTINCT FROM (SELECT p.subscription_status FROM public.profiles p WHERE p.id = auth.uid())
    AND projects_created IS NOT DISTINCT FROM (SELECT p.projects_created FROM public.profiles p WHERE p.id = auth.uid())
    AND voucher_code IS NOT DISTINCT FROM (SELECT p.voucher_code FROM public.profiles p WHERE p.id = auth.uid())
    AND trial_ends_at IS NOT DISTINCT FROM (SELECT p.trial_ends_at FROM public.profiles p WHERE p.id = auth.uid())
    AND stripe_customer_id IS NOT DISTINCT FROM (SELECT p.stripe_customer_id FROM public.profiles p WHERE p.id = auth.uid())
    AND usage_seconds_used IS NOT DISTINCT FROM (SELECT p.usage_seconds_used FROM public.profiles p WHERE p.id = auth.uid())
  );


-- 3. Server-side heartbeat RPC
--    Called every 60s by the frontend while the tab is visible.
--    Adds elapsed seconds to the user's counter. Returns updated info.
--    Only counts for free users (pro/voucher users are exempt).

CREATE OR REPLACE FUNCTION public.record_usage(p_seconds integer DEFAULT 60)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles;
  v_new_total integer;
  v_limit integer := 86400;  -- 24 hours in seconds
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;

  -- Pro users and voucher holders don't consume usage
  IF v_profile.subscription_status = 'pro' OR v_profile.voucher_code IS NOT NULL THEN
    RETURN jsonb_build_object(
      'usage_seconds_used', v_profile.usage_seconds_used,
      'usage_limit', v_limit,
      'usage_expired', false
    );
  END IF;

  -- Clamp p_seconds to prevent abuse (max 120s per call)
  IF p_seconds > 120 THEN
    p_seconds := 120;
  END IF;
  IF p_seconds < 0 THEN
    p_seconds := 0;
  END IF;

  -- Increment the counter
  v_new_total := LEAST(v_profile.usage_seconds_used + p_seconds, v_limit);

  UPDATE public.profiles
  SET usage_seconds_used = v_new_total
  WHERE id = auth.uid();

  RETURN jsonb_build_object(
    'usage_seconds_used', v_new_total,
    'usage_limit', v_limit,
    'usage_expired', (v_new_total >= v_limit)
  );
END;
$$;


-- 4. Update get_subscription_info to include usage data

CREATE OR REPLACE FUNCTION public.get_subscription_info()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles;
  v_project_count integer;
  v_can_create boolean;
  v_effective_status text;
  v_usage_limit integer := 86400;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;

  SELECT count(*) INTO v_project_count
  FROM public.projects
  WHERE user_id = auth.uid();

  -- Determine effective status (check trial expiry)
  v_effective_status := v_profile.subscription_status;
  IF v_profile.subscription_status = 'trial'
     AND v_profile.trial_ends_at IS NOT NULL
     AND v_profile.trial_ends_at < now() THEN
    v_effective_status := 'free';
  END IF;

  -- Determine if user can create a project
  v_can_create := (
    v_effective_status = 'pro'
    OR v_profile.voucher_code IS NOT NULL
    OR (v_effective_status = 'trial')
    OR (v_effective_status = 'free' AND v_project_count < 1)
  );

  RETURN jsonb_build_object(
    'status', v_effective_status,
    'projects_created', v_profile.projects_created,
    'project_count', v_project_count,
    'has_voucher', (v_profile.voucher_code IS NOT NULL),
    'voucher_code', v_profile.voucher_code,
    'trial_ends_at', v_profile.trial_ends_at,
    'can_create_project', v_can_create,
    'usage_seconds_used', COALESCE(v_profile.usage_seconds_used, 0),
    'usage_limit', v_usage_limit,
    'usage_expired', (COALESCE(v_profile.usage_seconds_used, 0) >= v_usage_limit)
  );
END;
$$;
