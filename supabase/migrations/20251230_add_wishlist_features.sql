-- Wishlist + Assignment infrastructure for ringo-kai
create extension if not exists "pgcrypto";

create table if not exists public.wishlists (
  user_id uuid primary key references public.users(id) on delete cascade,
  primary_item_name text,
  primary_item_url text,
  budget_min integer,
  budget_max integer,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.wishlist_assignments (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.users(id) on delete cascade,
  target_user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending',
  purchase_id uuid references public.purchases(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  submitted_at timestamptz,
  completed_at timestamptz
);

alter table public.wishlist_assignments
  add constraint wishlist_assignments_status_check
  check (status in ('pending', 'submitted', 'completed', 'cancelled'));

create unique index if not exists wishlist_assignments_pending_buyer_idx
  on public.wishlist_assignments(buyer_id)
  where status in ('pending', 'submitted');

create unique index if not exists wishlist_assignments_pending_target_idx
  on public.wishlist_assignments(target_user_id)
  where status in ('pending', 'submitted');

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_wishlists on public.wishlists;
create trigger set_updated_at_wishlists
before update on public.wishlists
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_wishlist_assignments on public.wishlist_assignments;
create trigger set_updated_at_wishlist_assignments
before update on public.wishlist_assignments
for each row execute function public.set_updated_at();

alter table public.wishlists enable row level security;
alter table public.wishlist_assignments enable row level security;

drop policy if exists "Wishlists are self-managed" on public.wishlists;
create policy "Wishlists are self-managed" on public.wishlists
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Buyers can view assignments" on public.wishlist_assignments;
create policy "Buyers can view assignments" on public.wishlist_assignments
  for select
  using (auth.uid() = buyer_id);
