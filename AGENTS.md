# agos-admin

Vite + React 19 + TypeScript admin dashboard for AGOS — a real-time water management and flood monitoring platform. Tailwind CSS 3, React Router 7, Axios (`apiClient` with JWT auto-refresh interceptors), Context API for state — no Redux/Zustand. This is the team's own fork (`PSergio984/agos-admin-v2`); upstream `RusselxD/agos-admin` is read-only reference — never push fork-specific changes upstream.

## Commands

```bash
npm install                 # package-lock.json is the lockfile (npm, not bun); npm ci for clean installs

npm run dev                 # vite --host — HMR dev server; needs .env (VITE_API_BASE_URL, VITE_API_WS_URL — see README)
npm run build               # tsc -b (typecheck) && vite build
npm run lint                # eslint .
npm run preview             # serve the production build locally
npm run test:reading-logs   # node tests/readingLogs.test.mjs — the only test
```

## Test conventions

No test framework (no Vitest/Jest). The only test is `npm run test:reading-logs`, a plain node script covering reading-log metrics, AI-stream, and token-refresh regressions. The real gates are `tsc -b` (strict, `noUnusedLocals`) and `eslint .` — keep both clean.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on `PSergio984/agos-admin-v2`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.
