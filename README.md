# CrowdScope

Track public-opinion trends through recurring polls — "signals" — backed by [Rapidata](https://rapidata.ai)'s human crowd.

A signal is a configured survey campaign (question, answer options, response count, optional country filter) that runs on a schedule. Each run dispatches a Rapidata classification job, collects real human responses, and adds a daily data point to a trend chart. Useful for tracking how public opinion shifts on a question over time.

## Architecture

- **Frontend** — Next.js 15 (App Router), React 19, Tailwind CSS, [`react-oidc-context`](https://github.com/authts/react-oidc-context) for authentication, TanStack Query for data fetching, Recharts for trend charts.
- **Backend** — Flask + SQLAlchemy + Postgres. Validates JWTs against Rapidata's OIDC server (`auth.rapidata.ai`). A background worker thread runs scheduled signal executions.
- **Integration** — uses the [`rapidata`](https://pypi.org/project/rapidata/) Python SDK to create classification jobs and collect results.

```
┌──────────────┐   /api/*   ┌─────────────┐   SDK   ┌──────────────┐
│  Next.js UI  │ ─────────► │ Flask API   │ ──────► │  Rapidata    │
│  (port 3000) │            │ (port 5328) │         │  Platform    │
└──────────────┘            └──────┬──────┘         └──────────────┘
                                   │
                            ┌──────▼──────┐
                            │  Postgres   │
                            │ (port 5433) │
                            └─────────────┘
```

## Project layout

```
src/                  # Next.js frontend
├── app/              # App router pages (signals list, detail, create, auth callback)
├── components/       # Reusable UI components (charts, modals, headers)
├── hooks/            # Custom React hooks (API calls, auth, notifications)
├── lib/              # Query client + helpers
└── middleware.ts     # Next.js middleware

api/                  # Flask backend
├── app.py            # Application factory + entrypoint
├── worker.py         # Background worker thread (runs scheduled signals)
├── config/           # Settings + DB initialization
├── middleware/       # CORS, auth (OIDC JWT validation), error handling
├── models/           # SQLAlchemy models (User, Signal, SignalRun, Response)
├── routes/           # HTTP route handlers
├── services/         # Business logic + Rapidata SDK calls
├── migrations/       # Alembic database migrations
└── flake.nix         # Nix dev shell (Python 3.13 + deps)
```

## Running locally

You'll need Node.js 20+, Docker (for Postgres), and Nix (for the Python dev shell).

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your StackAuth keys and database URL

# 2. Start Postgres
docker compose up -d

# 3. Install frontend deps and start everything
npm install
npm run dev   # runs frontend (port 3000) + backend (port 5328) concurrently
```

The backend depends on Rapidata's public OIDC server and the `rapidata` Python SDK; you'll need a Rapidata account to obtain real client credentials at runtime. The credentials are minted automatically via `auth.rapidata.ai/client` on first sign-in.

### Production build

```bash
npm run build           # type-check + bundle the Next.js app
npm run prod            # start frontend on :9001 and backend (gunicorn) on :5328
```

## License

Source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE). You may use, modify, and distribute the code for noncommercial purposes (research, education, personal experimentation). **Commercial use requires a separate license from Rapidata** — please open an issue on this repository to start that conversation.

Copyright © 2025 Rapidata AG.
