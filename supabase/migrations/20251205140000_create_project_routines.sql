create table public.project_routines (
  id uuid not null default gen_random_uuid (),
  project_id uuid not null references public.project (id) on delete cascade,
  description text not null,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'event')),
  assignee_id uuid references public.participants (id) on delete set null,
  company_id uuid not null references public.company (id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  constraint project_routines_pkey primary key (id)
);

create table public.minute_routines (
  id uuid not null default gen_random_uuid (),
  minute_id uuid not null references public.minutes (id) on delete cascade,
  routine_id uuid not null references public.project_routines (id) on delete cascade,
  status text not null default 'pending' check (status in ('completed', 'not_completed', 'partial', 'pending')),
  notes text null,
  created_at timestamp with time zone not null default now(),
  constraint minute_routines_pkey primary key (id),
  constraint minute_routines_unique_minute_routine unique (minute_id, routine_id)
);

-- RLS Policies
alter table public.project_routines enable row level security;
alter table public.minute_routines enable row level security;

create policy "Users can view project routines of their company" on public.project_routines
  for select using (auth.uid() in (
    select user_id from public.user_company where company_id = project_routines.company_id
    union
    select user_id from public.participants where company_id = project_routines.company_id
  ));

create policy "Admins can insert project routines" on public.project_routines
  for insert with check (auth.uid() in (
    select user_id from public.user_company where company_id = project_routines.company_id
  ));

create policy "Admins can update project routines" on public.project_routines
  for update using (auth.uid() in (
    select user_id from public.user_company where company_id = project_routines.company_id
  ));

create policy "Admins can delete project routines" on public.project_routines
  for delete using (auth.uid() in (
    select user_id from public.user_company where company_id = project_routines.company_id
  ));

-- Minute Routines Policies (inherit access from minute -> project -> company)
create policy "Users can view minute routines of their company" on public.minute_routines
  for select using (
    exists (
      select 1 from public.minutes m
      join public.project p on m.project_id = p.id
      where m.id = minute_routines.minute_id
      and (
        exists (select 1 from public.user_company uc where uc.user_id = auth.uid() and uc.company_id = p.company_id)
        or
        exists (select 1 from public.participants par where par.user_id = auth.uid() and par.company_id = p.company_id)
      )
    )
  );

create policy "Admins can manage minute routines" on public.minute_routines
  for all using (
    exists (
      select 1 from public.minutes m
      join public.project p on m.project_id = p.id
      where m.id = minute_routines.minute_id
      and exists (select 1 from public.user_company uc where uc.user_id = auth.uid() and uc.company_id = p.company_id)
    )
  );
