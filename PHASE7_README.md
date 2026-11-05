# CIVITAS Phase 7 — Human oversight foundation

## Scope
Adds append-only, one-decision-per-investigation human review records to the existing SQLite database. Decisions are `approved`, `rejected`, or `changes_requested`. The API prevents approval when any investigation stage is incomplete or `source_required`; policy/benchmark `review_required` is not independent authentication. Approval only signifies advisory review; it does not close a case or trigger government actions.

## Install (backup first)
From `~/Projects/CIVITAS`, after backing up `backend/app` and `data/civitas.sqlite3`, extract the ZIP into the project root. Existing `main.py` is extended; `review.py` is new. No database deletion or reset required. Restart uvicorn.

Set a private, unpredictable reviewer key **in the terminal that starts uvicorn**, e.g. `export CIVITAS_REVIEWER_API_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"`. Record the key securely for testing. Without a key, review writes return 503; reads remain available. This shared key is **development-only**; production requires identity provider, roles, TLS, rate limiting, and stronger audit controls.

## Routes
- `GET /api/cases/{case_id}/reviews` — list review history (development-only unauthenticated read; restrict before deployment)
- `POST /api/cases/{case_id}/investigations/{investigation_id}/reviews` — header `X-Reviewer-Key` required

Example body:
`{"decision":"changes_requested","reviewer":"Government reviewer","rationale":"Provide authenticated and dated UAE policy sources before approval.","acknowledged_limitations":false}`

## Tests
`python3 -m unittest discover -s tests -p 'test_*.py' -v`

## Not yet implemented
Official source authentication, jurisdiction/effective-date verification, substantive entailment validation, production authentication/authorization, frontend review UI, live LLM integration testing, external agency actions. Existing extract-only policy and benchmark stages are intentionally unchanged.
