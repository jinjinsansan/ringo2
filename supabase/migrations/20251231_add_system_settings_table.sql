create extension if not exists "pgcrypto";

create table if not exists public.system_settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_system_settings_updated_at on public.system_settings;
create trigger trg_system_settings_updated_at
before update on public.system_settings
for each row execute function public.touch_updated_at();

insert into public.system_settings (key, value, description)
values
  ('rtp_poison_weight', '50', 'Base probability weight for poison apple'),
  ('rtp_bronze_weight', '35', 'Base probability weight for bronze apple'),
  ('rtp_silver_weight', '10', 'Base probability weight for silver apple'),
  ('rtp_gold_weight', '4.9', 'Base probability weight for gold apple'),
  ('rtp_red_weight', '0.1', 'Base probability weight for red apple')
on conflict (key) do nothing;

create or replace function public.referral_summary()
returns table(total_referrals bigint, average_referrals numeric)
language sql
as $$
  select
    coalesce(sum(referral_count), 0)::bigint as total_referrals,
    coalesce(avg(referral_count), 0)::numeric as average_referrals
  from public.users;
$$;
