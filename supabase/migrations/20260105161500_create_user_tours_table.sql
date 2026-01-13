create table if not exists user_tours (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tour_key text not null,
  completed_at timestamptz default now(),
  skipped boolean default false,
  created_at timestamptz default now()
);

alter table user_tours enable row level security;

create policy "Users can insert their own tour status"
  on user_tours for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own tour status"
  on user_tours for select
  using (auth.uid() = user_id);
