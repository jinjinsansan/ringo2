create extension if not exists "pgcrypto";

create table if not exists public.fulfillment_events (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid references public.purchases(id) on delete cascade,
  assignment_id uuid references public.wishlist_assignments(id) on delete set null,
  buyer_id uuid references public.users(id) on delete set null,
  recipient_id uuid references public.users(id) on delete set null,
  status text not null check (status in ('completed', 'rejected')),
  screenshot_url text,
  buyer_notes text,
  purchase_created_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists fulfillment_events_purchase_idx on public.fulfillment_events(purchase_id);
create index if not exists fulfillment_events_assignment_idx on public.fulfillment_events(assignment_id);
create index if not exists fulfillment_events_buyer_idx on public.fulfillment_events(buyer_id);
create index if not exists fulfillment_events_recipient_idx on public.fulfillment_events(recipient_id);
