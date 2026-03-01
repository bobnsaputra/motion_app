-- Create projects table: each user can have many projects
-- The `data` column stores the full JSON blob (same shape as the exported .json file)
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null default 'Untitled',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast lookups by user
create index projects_user_id_idx on public.projects (user_id);

-- Enable Row Level Security
alter table public.projects enable row level security;

-- Users can only see their own projects
create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = user_id);

-- Users can insert their own projects
create policy "Users can create own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

-- Users can update their own projects
create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

-- Users can delete their own projects
create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at on changes
create trigger on_project_updated
  before update on public.projects
  for each row execute function public.handle_updated_at();
