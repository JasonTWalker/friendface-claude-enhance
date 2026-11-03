---
name: run-friendface-ui
description: Run, start, launch, drive, test or screenshot the Friendface React UI (friendface-ui). Use when asked to run the app, see a change working in the browser, take screenshots, or check login/post/like/delete flows end to end.
---

# Run friendface-ui

Vite + React app. In dev, an MSW service worker answers every API call (`http://localhost:3000`) inside the browser, so **no backend or json-server is needed**. Mock posts/users reset to their defaults on every page refresh (by design), but a saved login survives a refresh.

`driver.mjs` (next to this file) launches the dev server, drives it in headless Edge through the whole login/post/like/delete flow with `playwright-core`, asserts what it sees, and saves a screenshot per stage. Windows 11 + Git Bash. All paths below are relative to `friendface-ui/`.

## Prerequisites

- Node (tested on v24) and the app's deps: `npm install`
- Microsoft Edge (preinstalled on Windows 11). The driver uses it via `channel: "msedge"`, so no browser download.
- The driver's one dependency (`playwright-core`, kept out of the app's `package.json`):

```bash
cd .claude/skills/run-friendface-ui && npm install && cd ../../..
```

## Run (agent path)

```bash
node .claude/skills/run-friendface-ui/driver.mjs "$TEMP/friendface-shots"
```

- Starts `npm run dev` on port 5173 if nothing is listening (override with `PORT=5180`), reuses it if something is, and stops it afterwards only if it started it.
- Prints `ok:` per assertion and `ALL CHECKS PASSED`; exit code 0 on success, 1 on the first failure.
- Screenshots land in the directory you pass (default `./screenshots`, so pass a temp dir to avoid littering the repo): `01-logged-out-home.png` ... `08-mockuser1.png`. Look at them; a blank page or error overlay means it didn't really work.
- Flow covered: logged-out home (4 seeded posts, no Like/Delete) -> register `driver-user` -> create post -> like -> only own post deletable -> delete -> refresh (login kept, mock data reset) -> log out -> log in as seeded `mockuser1` / `password1` (sees Delete on exactly its 2 posts).

To poke at something else, copy the `chromium.launch({ channel: "msedge" })` + `page.goto("http://localhost:5173")` pattern from the driver, with the dev server up (`npm run dev`).

## Run (human path)

```bash
npm run dev
```

Open http://localhost:5173. Seeded accounts: `mockuser1` / `password1` (owns MockPost1, MockPost2), `mockuser2` / `password2` (owns MockPost3). MockPost4 has no owner, so nobody can delete it.

## Test

```bash
npx vitest run
```

Passes (14 tests, ~10s). `npm run lint` and `npm run build` currently fail on pre-existing issues (unused imports, hook called after an early return and `selector` possibly undefined in `Post.tsx`), so `build` stops at `tsc -b`. Not caused by the driver.

## Gotchas

- **MSW only runs under `npm run dev`** (`import.meta.env.DEV` in `src/main.tsx`). A `vite build` + `preview` has no mocked API and shows "There was an error loading posts data".
- **Vite on Windows can listen on IPv6 only** (`[::1]:5173`). Check/connect via `localhost`, not `127.0.0.1`, or you will wrongly conclude the server never started.
- **The create-post form stays open after submitting**, and the "Create Postt" button (typo is in the app) is a *toggle*. Clicking it again closes the form; check whether `input[name=content]` is visible before clicking.
- **Refresh resets the mock data but not the login.** After a refresh your session is the same user id with a mock that has forgotten the account, so re-logging in as a *registered* user fails; seeded users always work.
- Elements are found by role/name/`name` attribute (`input[name=username]`, `input[name=password]`, `input[name=content]`, `article.post`, `.post__author`), not `data-testid`, except the buttons, which also carry `like-button`/`delete-button` test ids.

## Troubleshooting

- `dev server already running on 5173, reusing it` when you didn't start one: an earlier run's Vite was left behind (this happened when the driver failed before its port check passed). Kill the listener, then rerun:

```powershell
Get-NetTCPConnection -LocalPort 5173 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

- `dev server did not open its port within 30s`: run `npm run dev` by hand and read its output (missing `npm install`, port taken).
- `locator.fill: Timeout ... waiting for locator('input[name=content]')`: the form was toggled closed, see Gotchas.
