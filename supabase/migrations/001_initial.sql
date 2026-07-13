-- ============================================================
-- Starex One — Initial Migration
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null default '',
  enrollment_no text,
  role          text not null default 'student'
                  check (role in ('student','warden','security','mess_manager')),
  avatar_url    text,
  phone         text,
  hostel_room   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Trigger: auto-insert profile on new auth user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'student'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── gate_passes ───────────────────────────────────────────────
create table public.gate_passes (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.profiles(id) on delete cascade,
  from_location   text not null default 'Starex University',
  to_location     text not null,
  exit_datetime   timestamptz not null,
  return_datetime timestamptz not null,
  description     text not null,
  status          text not null default 'pending'
                    check (status in ('pending','approved','denied','checked_out','checked_in')),
  approved_by     uuid references public.profiles(id),
  approved_at     timestamptz,
  denied_reason   text,
  checked_out_at  timestamptz,
  checked_out_by  uuid references public.profiles(id),
  checked_in_at   timestamptz,
  checked_in_by   uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── food_menu ─────────────────────────────────────────────────
create table public.food_menu (
  id          uuid primary key default gen_random_uuid(),
  menu_date   date not null,
  meal_type   text not null
                check (meal_type in ('breakfast','lunch','snacks','dinner')),
  items       text[] not null default '{}',
  start_time  time not null,
  end_time    time not null,
  updated_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (menu_date, meal_type)
);

-- ── updated_at triggers ───────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger gate_passes_updated_at
  before update on public.gate_passes
  for each row execute procedure public.set_updated_at();

create trigger food_menu_updated_at
  before update on public.food_menu
  for each row execute procedure public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────
alter table public.profiles  enable row level security;
alter table public.gate_passes enable row level security;
alter table public.food_menu   enable row level security;

-- profiles: own read
create policy "profiles: own read"
  on public.profiles for select
  using (auth.uid() = id);

-- profiles: own update (for avatar, phone, etc.)
create policy "profiles: own update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- profiles: warden and security can read all (for student lookup)
create policy "profiles: staff read"
  on public.profiles for select
  using (
    (select role from public.profiles where id = auth.uid())
    in ('warden', 'security')
  );

-- gate_passes: student insert own only
create policy "gate_passes: student insert"
  on public.gate_passes for insert
  with check (
    auth.uid() = student_id
    and (select role from public.profiles where id = auth.uid()) = 'student'
  );

-- gate_passes: student select own only
create policy "gate_passes: student select"
  on public.gate_passes for select
  using (
    auth.uid() = student_id
    and (select role from public.profiles where id = auth.uid()) = 'student'
  );

-- gate_passes: warden full access
create policy "gate_passes: warden all"
  on public.gate_passes for all
  using ((select role from public.profiles where id = auth.uid()) = 'warden')
  with check ((select role from public.profiles where id = auth.uid()) = 'warden');

-- gate_passes: security select all
create policy "gate_passes: security select"
  on public.gate_passes for select
  using ((select role from public.profiles where id = auth.uid()) = 'security');

-- gate_passes: security update (row-level; column-level enforced in route handler)
create policy "gate_passes: security update"
  on public.gate_passes for update
  using ((select role from public.profiles where id = auth.uid()) = 'security');

-- food_menu: all authenticated can read
create policy "food_menu: authenticated read"
  on public.food_menu for select
  using (auth.role() = 'authenticated');

-- food_menu: only mess_manager can insert
create policy "food_menu: mess_manager insert"
  on public.food_menu for insert
  with check (
    (select role from public.profiles where id = auth.uid()) = 'mess_manager'
  );

-- food_menu: only mess_manager can update
create policy "food_menu: mess_manager update"
  on public.food_menu for update
  using ((select role from public.profiles where id = auth.uid()) = 'mess_manager')
  with check ((select role from public.profiles where id = auth.uid()) = 'mess_manager');
