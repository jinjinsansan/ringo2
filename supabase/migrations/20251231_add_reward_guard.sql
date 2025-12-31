alter table if exists public.apples
  add column if not exists reward_applied_at timestamptz;

create index if not exists apples_reward_applied_at_idx
  on public.apples (reward_applied_at);
