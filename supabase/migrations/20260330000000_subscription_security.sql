-- ============================================================================
-- SUBSCRIPTION SECURITY MIGRATION
-- Locks down profiles, enforces project limits server-side, adds voucher system
-- ============================================================================

-- ============================================================================
-- 1. LOCK DOWN PROFILE SELF-UPDATES
--    Users must NOT be able to modify subscription_status, projects_created,
--    voucher_code, trial_ends_at, or stripe_customer_id.
-- ============================================================================

-- Drop the overly-permissive update policy
drop policy if exists "Users can update own profile" on public.profiles;

-- Allow users to update ONLY safe fields (username)
-- The WITH CHECK ensures sensitive columns haven't been changed from their current values
create policy "Users can update own safe fields"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    subscription_status IS NOT DISTINCT FROM (select p.subscription_status from public.profiles p where p.id = auth.uid())
    and projects_created IS NOT DISTINCT FROM (select p.projects_created from public.profiles p where p.id = auth.uid())
    and voucher_code IS NOT DISTINCT FROM (select p.voucher_code from public.profiles p where p.id = auth.uid())
    and trial_ends_at IS NOT DISTINCT FROM (select p.trial_ends_at from public.profiles p where p.id = auth.uid())
    and stripe_customer_id IS NOT DISTINCT FROM (select p.stripe_customer_id from public.profiles p where p.id = auth.uid())
  );


-- ============================================================================
-- 2. SERVER-ENFORCED PROJECT CREATION
--    This function is the ONLY way to create a project.
--    It validates subscription status, project count, trial expiry.
-- ============================================================================

create or replace function public.create_project_if_allowed(
  p_title text default 'Untitled',
  p_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer  -- runs as DB owner, bypasses RLS
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_project_count integer;
  v_project public.projects;
begin
  -- 1. Get user's profile (server-side, trusted)
  select * into v_profile
  from public.profiles
  where id = auth.uid();

  if v_profile is null then
    raise exception 'PROFILE_NOT_FOUND: User profile does not exist';
  end if;

  -- 2. Count existing projects
  select count(*) into v_project_count
  from public.projects
  where user_id = auth.uid();

  -- 3. Check trial expiry first
  if v_profile.subscription_status = 'trial'
     and v_profile.trial_ends_at is not null
     and v_profile.trial_ends_at < now() then
    -- Trial expired → revert to free
    update public.profiles
    set subscription_status = 'free'
    where id = auth.uid();
    -- Refresh the local variable
    v_profile.subscription_status := 'free';
  end if;

  -- 4. Enforce limits based on subscription status
  if v_profile.subscription_status = 'free'
     and v_profile.voucher_code is null
     and v_project_count >= 1 then
    raise exception 'PROJECT_LIMIT_REACHED: Upgrade to Pro to create more projects';
  end if;

  -- 5. All checks passed — create the project
  insert into public.projects (user_id, title, data)
  values (auth.uid(), p_title, p_data)
  returning * into v_project;

  -- 6. Increment projects_created counter
  update public.profiles
  set projects_created = projects_created + 1
  where id = auth.uid();

  -- 7. Return the created project as JSON
  return to_jsonb(v_project);
end;
$$;


-- ============================================================================
-- 3. REMOVE DIRECT INSERT POLICY ON PROJECTS
--    Since creation goes through the RPC function (security definer),
--    users should NOT be able to insert directly.
-- ============================================================================

drop policy if exists "Users can create own projects" on public.projects;


-- ============================================================================
-- 4. VOUCHER CODES TABLE
--    Stores valid voucher codes with usage limits and expiry.
--    No RLS SELECT policy = users can't read/enumerate codes.
-- ============================================================================

create table if not exists public.voucher_codes (
  code text primary key,
  type text not null check (type in ('educator', 'student', 'community', 'promo')),
  max_uses integer default 1,
  times_used integer default 0,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- Enable RLS but add NO policies = table is invisible to normal users
alter table public.voucher_codes enable row level security;


-- ============================================================================
-- 5. SERVER-SIDE VOUCHER REDEMPTION
--    Validates code, checks usage/expiry, applies to user profile.
-- ============================================================================

create or replace function public.redeem_voucher(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voucher public.voucher_codes;
  v_existing_voucher text;
begin
  -- Check if user already has a voucher
  select voucher_code into v_existing_voucher
  from public.profiles
  where id = auth.uid();

  if v_existing_voucher is not null then
    return jsonb_build_object('status', 'ALREADY_REDEEMED', 'message', 'You have already redeemed a voucher code.');
  end if;

  -- Look up voucher (case-insensitive, trimmed)
  select * into v_voucher
  from public.voucher_codes
  where code = upper(trim(p_code));

  if v_voucher is null then
    return jsonb_build_object('status', 'INVALID_CODE', 'message', 'This voucher code is not valid.');
  end if;

  if v_voucher.times_used >= v_voucher.max_uses then
    return jsonb_build_object('status', 'CODE_EXHAUSTED', 'message', 'This voucher code has been fully used.');
  end if;

  if v_voucher.expires_at is not null and v_voucher.expires_at < now() then
    return jsonb_build_object('status', 'CODE_EXPIRED', 'message', 'This voucher code has expired.');
  end if;

  -- Apply the voucher
  update public.voucher_codes
  set times_used = times_used + 1
  where code = v_voucher.code;

  update public.profiles
  set voucher_code = v_voucher.code,
      subscription_status = 'pro'
  where id = auth.uid();

  return jsonb_build_object('status', 'SUCCESS', 'message', 'Voucher code applied! You now have Pro access.');
end;
$$;


-- ============================================================================
-- 6. HELPER: Start a 3-day trial for the current user
--    Called when user clicks "Start Free Trial" in the upgrade modal.
-- ============================================================================

create or replace function public.start_trial()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  select * into v_profile
  from public.profiles
  where id = auth.uid();

  if v_profile is null then
    return jsonb_build_object('status', 'ERROR', 'message', 'Profile not found.');
  end if;

  -- Can only start trial if currently free and never trialled before
  if v_profile.subscription_status != 'free' then
    return jsonb_build_object('status', 'ALREADY_SUBSCRIBED', 'message', 'You already have an active subscription.');
  end if;

  if v_profile.trial_ends_at is not null then
    return jsonb_build_object('status', 'TRIAL_USED', 'message', 'You have already used your free trial.');
  end if;

  -- Start 3-day trial
  update public.profiles
  set subscription_status = 'trial',
      trial_ends_at = now() + interval '7 days'
  where id = auth.uid();

  return jsonb_build_object(
    'status', 'SUCCESS',
    'message', 'Your 7-day trial has started!',
    'trial_ends_at', (now() + interval '7 days')::text
  );
end;
$$;


-- ============================================================================
-- 7. HELPER: Get the current user's subscription info (read-only)
--    Used by the frontend to display subscription status.
-- ============================================================================

create or replace function public.get_subscription_info()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_project_count integer;
  v_can_create boolean;
  v_effective_status text;
begin
  select * into v_profile
  from public.profiles
  where id = auth.uid();

  if v_profile is null then
    return jsonb_build_object('error', 'Profile not found');
  end if;

  select count(*) into v_project_count
  from public.projects
  where user_id = auth.uid();

  -- Determine effective status (check trial expiry)
  v_effective_status := v_profile.subscription_status;
  if v_profile.subscription_status = 'trial'
     and v_profile.trial_ends_at is not null
     and v_profile.trial_ends_at < now() then
    v_effective_status := 'free';
  end if;

  -- Determine if user can create a project
  v_can_create := (
    v_effective_status = 'pro'
    or v_profile.voucher_code is not null
    or (v_effective_status = 'trial')
    or (v_effective_status = 'free' and v_project_count < 1)
  );

  return jsonb_build_object(
    'status', v_effective_status,
    'projects_created', v_profile.projects_created,
    'project_count', v_project_count,
    'has_voucher', (v_profile.voucher_code is not null),
    'voucher_code', v_profile.voucher_code,
    'trial_ends_at', v_profile.trial_ends_at,
    'can_create_project', v_can_create
  );
end;
$$;
