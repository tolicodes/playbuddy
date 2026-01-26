-- Promo code redemptions: create table + indexes

create table if not exists public.promo_code_redemptions (
    id uuid primary key default gen_random_uuid(),
    promo_code_id uuid not null references public.promo_codes(id) on delete cascade,
    redemption_date timestamptz not null,
    gross_amount numeric not null,
    commission_percentage numeric not null,
    commission_amount numeric not null,
    created_at timestamptz default now()
);

alter table public.promo_code_redemptions enable row level security;

alter table public.promo_code_redemptions
    add column if not exists commission_percentage numeric;

update public.promo_code_redemptions
set commission_percentage = case
    when gross_amount is null or gross_amount = 0 then 0
    else round((commission_amount / gross_amount) * 100, 4)
end
where commission_percentage is null;

alter table public.promo_code_redemptions
    alter column commission_percentage set not null;

create index if not exists promo_code_redemptions_promo_code_id_idx
    on public.promo_code_redemptions (promo_code_id);

create index if not exists promo_code_redemptions_promo_code_id_date_idx
    on public.promo_code_redemptions (promo_code_id, redemption_date);
