create table if not exists public.apple_reward_bank (
  id integer primary key default 1,
  upper_tokens integer not null default 0 check (upper_tokens >= 0),
  poison_total integer not null default 0 check (poison_total >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.apple_reward_bank (id, upper_tokens, poison_total)
values (1, 0, 0)
on conflict (id) do nothing;

create or replace function public.apple_reward_touch_updated()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_apple_reward_bank_touch on public.apple_reward_bank;
create trigger trg_apple_reward_bank_touch
before update on public.apple_reward_bank
for each row execute function public.apple_reward_touch_updated();

create or replace function public.apple_reward_add_tokens(amount integer default 1)
returns void
language plpgsql
as $$
declare
  sanitized integer := greatest(coalesce(amount, 0), 0);
begin
  if sanitized = 0 then
    return;
  end if;
  update public.apple_reward_bank
  set upper_tokens = upper_tokens + sanitized,
      poison_total = poison_total + sanitized
  where id = 1;
end;
$$;

create or replace function public.apple_reward_consume_token()
returns boolean
language plpgsql
as $$
declare
  consumed boolean := false;
begin
  update public.apple_reward_bank
  set upper_tokens = upper_tokens - 1
  where id = 1 and upper_tokens > 0
  returning true into consumed;
  return coalesce(consumed, false);
end;
$$;
