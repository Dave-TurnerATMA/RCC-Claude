# RCC-Claude — Repo Notes

## Branch policy

**`claude/zen-cori-U3olx` is the one and only branch for this project.**
All app code lives here: the Community Resilience Action backend/frontend,
the spreadsheet-import feature, and the EVCA upload/processing UI
(`backend/src/routes/evca.ts`, `backend/src/db/evca-database.ts`,
`evca/scripts/import_spreadsheet.py`, `evca/output/metadata.sql`).

`claude/focused-volta-rLmgU` was an earlier branch that the EVCA feature was
mistakenly built on in isolation. It has been fully merged into
`claude/zen-cori-U3olx` and should be deleted (or never checked out again).
**Do not split work across branches** — if EVCA-related files seem to be
"missing" on `claude/zen-cori-U3olx`, that's a bug to fix by merging them in,
not a reason to start working on a different branch.

Before starting any work in a fresh session: confirm the working branch is
`claude/zen-cori-U3olx` (`git branch --show-current`) and that it has no
divergent siblings holding unmerged app code (`git branch -a`).

## Production deployment

- Server: AWS EC2 Ubuntu, app checked out at `/home/ubuntu/community-prep`.
- The server's git checkout **must be on `claude/zen-cori-U3olx`** — verify
  with `git log -1 --oneline` (commit hash should match the latest pushed
  commit) and `git branch --show-current`. `update.sh`'s `git reset --hard`
  does NOT switch branches if HEAD is on the wrong one — check this first,
  every time, before assuming a stale deploy is just a caching issue.
- App database: `backend/data/community_prep.db` (NOT `backend/community-prep.db`
  — a similarly-named but wrong path that caused a real bug once, see git log).
- PM2 process name: `community-prep`, config: `ecosystem.config.js`
  (`script: dist/index.js`, `cwd: backend/`).
- `ANTHROPIC_API_KEY` must be set directly in `ecosystem.config.js`'s `env:`
  block — the server does not source `.env` via dotenv in the PM2-managed
  process unless `dotenv/config` is imported first in `index.ts` (it is, but
  PM2 env vars still need to be set explicitly in the ecosystem file too).

## Release checklist — always give the user these exact commands

When pushing a change that needs to go live, always provide this exact
sequence (don't just say "run update.sh" — spell it out so there's no branch
ambiguity):

```bash
cd /home/ubuntu/community-prep
git fetch origin
git checkout claude/zen-cori-U3olx   # in case HEAD drifted to another branch
git reset --hard origin/claude/zen-cori-U3olx
git log -1 --oneline                  # confirm this matches the commit just pushed
bash update.sh
```

After `update.sh` runs, give a verification step appropriate to the change
(e.g. `sqlite3 backend/data/community_prep.db "SELECT ...;"`, `pm2 logs
community-prep --lines 30 --nostream`, or hitting the relevant URL) so the
user can confirm the deploy actually took effect rather than assuming it did.
