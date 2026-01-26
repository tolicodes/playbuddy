-- Promo codes: add commission_percentage with 10% default + backfill

alter table public.promo_codes
    add column if not exists commission_percentage numeric default 10;

update public.promo_codes
set commission_percentage = 10
where commission_percentage is null;
