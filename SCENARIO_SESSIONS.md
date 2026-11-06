# Scenario sessions — implementation and verification

## What is implemented

- Durable SQLite scenario session creation, retrieval, and event history.
- Explicit state machine: `draft -> running <-> paused -> completed`.
- An operator must release each configured hypothetical event; event release is timestamped and persisted.
- Case existence validation, Pydantic input constraints, atomic state transitions with `BEGIN IMMEDIATE`, and 409 responses for invalid actions.
- Every session creation and transition writes to the existing case audit table.
- Same-origin API gateway routes with timeout and error propagation.
- Scenario Lab creation form, session list, and action controls based on backend-confirmed status.
- Tests added in `backend/tests/test_scenario_sessions.py`.

## What this does NOT implement

- The event scheduler **does not** execute an AI agent, alter case state, change policy decisions, or claim to simulate a government action.
- Pause/resume controls are **not** controls for the existing durable AI investigation worker. That worker remains independently running; its lifecycle is described in `backend/app/job_queue.py`.
- Automatic time-based event release, per-agent information partitioning, branching, cross-scenario comparison, and evaluation are not implemented.

## Run locally

From the repository root:

```bash
python -m pytest backend/tests/test_scenario_sessions.py -q
```

Start the FastAPI service and its worker using the repository's existing run instructions. In another terminal:

```bash
cd frontend
npm ci
npm test
npm run build
npm run dev
```

Open the URL printed by Vite, select a case, then open **Scenario lab**.

## Endpoints

- `GET /api/cases/{case_id}/scenario-sessions`
- `POST /api/cases/{case_id}/scenario-sessions`
- `GET /api/cases/{case_id}/scenario-sessions/{session_id}`
- `POST /api/cases/{case_id}/scenario-sessions/{session_id}/start`
- `POST /api/cases/{case_id}/scenario-sessions/{session_id}/pause`
- `POST /api/cases/{case_id}/scenario-sessions/{session_id}/resume`
- `POST /api/cases/{case_id}/scenario-sessions/{session_id}/next`

The frontend proxies list/create and transition routes. All routes operate on explicitly hypothetical scenario sessions.
