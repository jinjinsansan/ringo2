create extension if not exists "pgcrypto";

alter table if exists public.users
  add column if not exists referral_code text;

alter table if exists public.users
  add column if not exists referral_count integer not null default 0;

alter table if exists public.users
  add column if not exists referred_by uuid references public.users(id);

update public.users
set referral_code = coalesce(referral_code, encode(gen_random_bytes(5), 'hex'))
where referral_code is null;

alter table if exists public.users
  alter column referral_code set not null;

create unique index if not exists users_referral_code_idx
  on public.users(referral_code);

create or replace function public.claim_referral_bonus(
    new_user_id uuid,
    ref_code text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    referrer_id uuid;
begin
    if new_user_id is null or ref_code is null then
        return false;
    end if;

    select id into referrer_id
    from public.users
    where referral_code = ref_code;

    if referrer_id is null or referrer_id = new_user_id then
        return false;
    end if;

    update public.users
    set referred_by = referrer_id
    where id = new_user_id
      and referred_by is null;

    if not found then
        return false;
    end if;

    update public.users
    set referral_count = referral_count + 1
    where id = referrer_id;

    return true;
end;
$$;

grant execute on function public.claim_referral_bonus(uuid, text) to anon, authenticated, service_role;
