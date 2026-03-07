-- Project sharing: allows a project owner to grant access to other users by email
create table public.project_shares (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects on delete cascade not null,
  owner_id uuid references auth.users on delete cascade not null,
  shared_with_email text not null,
  shared_with_id uuid references auth.users on delete cascade,
  permission text not null default 'view' check (permission in ('view', 'edit')),
  created_at timestamptz default now()
);

-- Each project can only be shared once per email
create unique index project_shares_unique_idx
  on public.project_shares (project_id, shared_with_email);

-- Fast lookup: projects shared with a specific user
create index project_shares_shared_with_id_idx
  on public.project_shares (shared_with_id);

-- Fast lookup: projects shared with a specific email (before user signs up)
create index project_shares_shared_with_email_idx
  on public.project_shares (shared_with_email);

-- Enable RLS
alter table public.project_shares enable row level security;

-- Owners can see shares they created
create policy "Owners can view own shares"
  on public.project_shares for select
  using (auth.uid() = owner_id);

-- Recipients can see shares for them (by user id)
create policy "Recipients can view shares for them"
  on public.project_shares for select
  using (auth.uid() = shared_with_id);

-- Recipients can see shares for them (by email from JWT)
create policy "Recipients can view shares by email"
  on public.project_shares for select
  using (auth.jwt() ->> 'email' = shared_with_email);

-- Owners can create shares for their own projects
create policy "Owners can create shares"
  on public.project_shares for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.projects
      where id = project_id and user_id = auth.uid()
    )
  );

-- Owners can update shares (change permission)
create policy "Owners can update own shares"
  on public.project_shares for update
  using (auth.uid() = owner_id);

-- Owners can delete (revoke) shares
create policy "Owners can delete own shares"
  on public.project_shares for delete
  using (auth.uid() = owner_id);

-- Allow shared users to SELECT projects shared with them
create policy "Shared users can view shared projects"
  on public.projects for select
  using (
    exists (
      select 1 from public.project_shares
      where project_shares.project_id = projects.id
        and (project_shares.shared_with_id = auth.uid() or project_shares.shared_with_email = auth.jwt() ->> 'email')
    )
  );

-- Allow shared users with 'edit' permission to UPDATE shared projects
create policy "Shared users can edit shared projects"
  on public.projects for update
  using (
    exists (
      select 1 from public.project_shares
      where project_shares.project_id = projects.id
        and (project_shares.shared_with_id = auth.uid() or project_shares.shared_with_email = auth.jwt() ->> 'email')
        and project_shares.permission = 'edit'
    )
  );

-- When a user signs up, backfill shared_with_id for any pending shares to their email
create or replace function public.backfill_shares_on_signup()
returns trigger as $$
begin
  update public.project_shares
  set shared_with_id = new.id
  where shared_with_email = new.email
    and shared_with_id is null;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created_backfill_shares
  after insert on auth.users
  for each row execute function public.backfill_shares_on_signup();

-- Allow profiles to be looked up by email (for the share modal email lookup)
create policy "Users can lookup profiles by email"
  on public.profiles for select
  using (true);
