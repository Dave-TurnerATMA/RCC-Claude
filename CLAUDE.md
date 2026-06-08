# RCC-Claude

Community disaster-preparedness planning application built for PMI (Indonesian Red Cross) and similar organisations.

## Subdirectories

- `backend/` — Express.js + TypeScript API, SQLite database (better-sqlite3)
- `frontend/` — React + TypeScript + Vite, Tailwind CSS
- `evca/` — EVCA spreadsheet analysis tools (separate concern — see `evca/CLAUDE.md`)

When working on the main application, focus on `backend/` and `frontend/`.
When working on EVCA spreadsheet analysis, work in `evca/` and follow `evca/CLAUDE.md`.

## Main Application Stack
- Backend: Express.js, TypeScript, SQLite (better-sqlite3, synchronous)
- Frontend: React, TypeScript, Vite, Tailwind CSS, react-i18next (EN/ES/ID)
- AI: Anthropic Claude API (Haiku 4.5)
- Deployment: Ubuntu 22.04 EC2, PM2, Nginx
- DB path: `backend/community-prep.db`
- Git branch: `claude/focused-volta-rLmgU`

## Main Application Spec
See `SPEC.md` for the full data model, API endpoints, and business rules.
