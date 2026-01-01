create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  title text not null,
  body text not null,
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_notifications_user_created_at
  on public.notifications(user_id, created_at desc);

create index if not exists idx_notifications_user_unread
  on public.notifications(user_id)
  where read_at is null;

create table if not exists public.newsletters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  preview_text text,
  sent_by uuid,
  sent_by_email text,
  sent_at timestamptz not null default timezone('utc', now()),
  recipient_count integer not null default 0
);

alter table public.apples
  add column if not exists result_email_sent_at timestamptz;

alter table public.wishlist_assignments
  add column if not exists recipient_notified_at timestamptz;
