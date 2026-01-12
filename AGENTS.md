# AGENTS.md

## Shared Types + Axios Hooks

- Source of truth lives in `common/src`.
- Do NOT edit per-app copies (e.g. `playbuddy-mobile/Common`, `playbuddy-api/src/common`, etc.).
- After any change in `common/src`, run:
  - `./common/copy_common.sh`
- The script syncs all apps; assume all apps must be updated together.

## New API Requests

- When adding a new API request or endpoint, also add a matching hook in `common/src/db-axios`.
- Use the `useEntity` pattern: `useFetchEntity`, `useCreateEntity`, `useUpdateEntity`, etc.
- Make the API change in `playbuddy-api` at the same time as the hook.

## SQL

Whenever making sql changes output them to the console instead of just the SQL file

## App Portions

### Weekly Picks

Whenever making changes to Event Card layout, remember to update the generated weekly picks in the api endpoint
