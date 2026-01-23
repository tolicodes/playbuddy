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

Whenever making sql changes output the instructions with the alter SQL to the chat instead of just the SQL file

## App Portions

### Event Card Layout

Whenever making changes to Event Card layout, remember to update

- the event card layout in the mobile app
- the generated weekly picks in the api endpoint
- weekly picks screen
- discover game screen

## Commits

Whenever I ask to do a commit, only commit the changes made in this chat
Only commit files related to the task; ignore unrelated changes even if modified.

Include all files related to the change, including any synced copies produced by `./common/copy_common.sh`.
Also commit the common/ types and axios changes and their copies when committing.

## Building

Except for mobile, after making a change run `npm run build`

## Mobile

### Modal

Whenever adding an a modal, make sure to add it to the debug menu as well

## Admin

Whenever adding an admin screen, add it in web as well as mobile
