# Chrome Web Store CLI

This extension uses `chrome-webstore-upload-cli` for command-line uploads.

## Setup

Export these environment variables before running the commands:

- `EXTENSION_ID`
- `CLIENT_ID`
- `CLIENT_SECRET`
- `REFRESH_TOKEN`

You can generate OAuth credentials and a refresh token with
`chrome-webstore-upload-keys`.

## Commands

- `npm run webstore:upload` (upload only)
- `npm run webstore:publish` (publish only)
- `npm run webstore:deploy` (build, upload, publish)
- `npm run webstore:zip` (build, create zip at `playbuddy-chrome-scraper.zip`)
