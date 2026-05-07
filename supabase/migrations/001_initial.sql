-- ============================================================
-- 001_initial.sql  –  BudgetCalc initial schema
-- ============================================================

-- ------------------------------------------------------------
-- ROOMS
-- ------------------------------------------------------------
-- rooms.id is a 6-char uppercase alphanumeric code (e.g. "ABC123")
create table if not exists rooms (
  id          text        primary key,
  name        text        not null,
  currency    text        not null default 'USD',
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- MEMBERS
-- ------------------------------------------------------------
create table if not exists members (
  id          uuid primary key default gen_random_uuid(),
  room_id     text        not null references rooms(id) on delete cascade,
  name        text        not null,
  color       text        not null,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- BUDGET ADDITIONS
-- ------------------------------------------------------------
create table if not exists budget_additions (
  id          uuid primary key default gen_random_uuid(),
  room_id     text        not null references rooms(id) on delete cascade,
  description text,
  amount      numeric(12, 2) not null check (amount > 0),
  date        date        not null default current_date,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- EXPENSES
-- ------------------------------------------------------------
create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  room_id     text        not null references rooms(id) on delete cascade,
  description text        not null,
  amount      numeric(12, 2) not null check (amount > 0),
  date        date        not null default current_date,
  source      text        not null check (source in ('group', 'personal')),
  paid_by_id  uuid        references members(id) on delete set null,
  split_among uuid[]      not null default '{}',
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------
create index if not exists members_room_id_idx         on members(room_id);
create index if not exists budget_additions_room_id_idx on budget_additions(room_id);
create index if not exists budget_additions_date_idx    on budget_additions(date);
create index if not exists expenses_room_id_idx         on expenses(room_id);
create index if not exists expenses_date_idx            on expenses(date);
create index if not exists expenses_paid_by_id_idx      on expenses(paid_by_id);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY  (open policies — no auth required)
-- ------------------------------------------------------------
alter table rooms            enable row level security;
alter table members          enable row level security;
alter table budget_additions enable row level security;
alter table expenses         enable row level security;

-- rooms
create policy "rooms: allow all"            on rooms            for all using (true) with check (true);
-- members
create policy "members: allow all"          on members          for all using (true) with check (true);
-- budget_additions
create policy "budget_additions: allow all" on budget_additions for all using (true) with check (true);
-- expenses
create policy "expenses: allow all"         on expenses         for all using (true) with check (true);

-- ------------------------------------------------------------
-- REALTIME  (subscribe to changes on all four tables)
-- ------------------------------------------------------------
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table members;
alter publication supabase_realtime add table budget_additions;
alter publication supabase_realtime add table expenses;
