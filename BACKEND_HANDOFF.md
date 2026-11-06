# Backend handoff for the UNICRON frontend team

**Source of truth:** `development` branch of `HR-Presents/Unicron`. Backend is Python/FastAPI + SQLite; frontend is separate. This document records the integration contract and remaining validation, **not** a claim of production readiness.

## Startup (from repository root)

```bash
python -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
CIVITAS_LLM_MODEL=unicron-local CIVITAS_LLM_BASE_URL=http://127.0.0.1:42516/v1 \
  .venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 42515
# separate terminal; needed to process queued investigations:
.venv/bin/python -m backend.app.job_queue
```

The LLM server must be started separately and expose OpenAI-compatible `/v1/chat/completions`. Local llama.cpp/Qwen3 tests confirmed that `chat_template_kwargs.enable_thinking=false` returns a fast visible answer; agent calls now send this setting. This parameter is server-specific: verify compatibility when switching to vLLM or another provider. Do not commit GGUF model files, local SQLite DB, secrets, or evidence documents.

Environment: `CIVITAS_LLM_MODEL`, `CIVITAS_LLM_BASE_URL`, `CIVITAS_DB_PATH` (default `data/civitas.sqlite3`), optional `CIVITAS_API_KEY` (Bearer auth for `/api/*` except health), optional `CIVITAS_LLM_TIMING=1` for timing. Frontend dev origin CORS is limited to localhost/127.0.0.1 port 3000.

## Discoverable API contract

Use **`http://127.0.0.1:42515/openapi.json`** and **`/docs`** as the canonical, generated request/response contract; do not guess schemas or simulate backend responses.

Key entrypoints:

| Purpose | Method | Path |
|---|---|---|
| Backend health | GET | `/api/health` |
| Dashboard summary | GET | `/api/summary` |
| Cases | GET, POST | `/api/cases` |
| Case status | PATCH | `/api/cases/{case_id}` |
| Intake triage / history | POST, GET | `/api/cases/{case_id}/triage` |
| Upload evidence / list | POST (multipart), GET | `/api/cases/{case_id}/evidence` |
| Search evidence | GET | `/api/cases/{case_id}/evidence/search?q=...` |
| Evidence analysis | POST | `/api/cases/{case_id}/evidence/analyze` |
| Evidence analysis history | GET | `/api/cases/{case_id}/evidence/analyses` |
| Queue investigation | POST | `/api/cases/{case_id}/investigate/async` |
| Jobs | GET | `/api/cases/{case_id}/jobs` |
| Job detail | GET | `/api/cases/{case_id}/jobs/{job_id}` |
| Audit history | GET | `/api/audit` |

Additional endpoints for provenance, reviewer decisions, global knowledge, scenario sessions, and investigation histories are registered by modules under `backend/app/`; enumerate **all** routes from OpenAPI before implementing their UI.

### Recommended frontend sequence

1. Check `GET /api/health` (this does **not** probe the LLM). Show independent LLM readiness based on an explicit model health check or a backend readiness endpoint, not this response.
2. Create/list a case; preserve the returned case ID.
3. Upload evidence, register provenance, and obtain genuine source verification/review. An uploaded document is **not** automatically verified.
4. `POST /api/cases/{case_id}/investigate/async`; store returned job ID.
5. Poll `GET /api/cases/{case_id}/jobs/{job_id}` until completed/failed/interrupted. **Queueing is not execution**: worker must run independently.
6. Fetch the persisted investigation outputs using the routes advertised by OpenAPI; display agent statuses, citations, review requirements, and error states. Never render a fake completed agent.
7. Surface review gates and allow authorized human reviewers to decide; do not label drafts as approved policy.

## Evidence and integrity rules

- Source provenance, source eligibility, jurisdiction applicability, and qualified human review are distinct checks.
- Citations are allowlisted against retrieved passages; this does **not** prove factual entailment.
- Global community contributions are contextual and moderated, **not** official policy evidence.
- Simulated scenarios must remain clearly labeled hypothetical.
- EU legislation must not be represented as UAE-applicable law without a qualified applicability determination.

## Verification checklist (still required)

- Run `.venv/bin/python -m pytest -q` and record full test count and failures.
- Test an actual non-thinking JSON completion from each model-driven agent, including triage, evidence, scenario, and synthesis.
- Run a full six-stage queued investigation with a running worker and verify persisted events and final results.
- Validate source-family retrieval on the actual five-policy evidence set, and verify citations and reviewer gates.
- Test invalid model JSON, LLM unavailable/timeout, worker interruption/recovery, duplicate job submissions, auth, CORS, and database persistence.
- Validate on GPU/vLLM separately; the local CPU/llama.cpp test is **not** GPU validation.
- Keep UI changes out of this backend handoff.

## Local development case warning

The prior development machine used case `CIV-20261105-13934C` with 20 evidence uploads and 999 passages, but these are **local SQLite data**, not automatically included in GitHub. A new clone will not have that case or its source files. Import only lawfully shareable documents, preserve provenance, and do not fabricate verification outcomes.
