alter table public.wishlists
  add column if not exists item_price_jpy integer;

update public.wishlists
set item_price_jpy = coalesce(budget_min, budget_max, 3500)
where item_price_jpy is null;

alter table public.wishlists
  alter column item_price_jpy set not null;

alter table public.wishlists
  add constraint wishlists_price_range_check
  check (item_price_jpy between 3000 and 4000);
