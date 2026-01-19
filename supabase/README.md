# Supabase Migrations

## Structure

- `supabase/migrations/` holds ordered SQL migrations for the database schema.
- `supabase/seed.sql` holds seed data applied by `supabase db reset`.

The current schema baseline lives in
`supabase/migrations/20240903204236_remote_schema.sql` and is a snapshot of the
current remote database schema. A placeholder exists for the earlier remote
migration version (`20240903204138_remote_schema.sql`) to keep history aligned.
Add new changes as incremental migrations instead of editing the baseline.

`schema.sql` is intentionally not used as a source of truth.

## Create a migration

```sh
supabase migration new add_my_change
# or, if you prefer generating SQL from a local diff:
supabase db diff -f add_my_change
```

## Apply locally

```sh
supabase db reset
```

## Push to remote

```sh
supabase db push
```
