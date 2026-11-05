# UNICRON

**Evidence-grounded, human-governed multi-agent intelligence for public-sector AI decisions.**

UNICRON is an experimental full-stack platform developed for the ITU AI for Good UAE hackathon. It explores domain-specific government service cases, verified policy sources, international benchmarks, moderated community knowledge, and observable AI-agent investigations.

> **Development status:** This repository contains working backend capabilities and a Next.js frontend prototype. The frontend still includes demonstration-only workflows and is not yet fully integrated with the investigation backend. Outputs are advisory, not legal determinations; qualified human review is required for policy conclusions.

## Architecture

- **Backend:** Python, FastAPI, SQLite; durable investigation queue and worker; evidence provenance, source verification, audit history, and review workflows.
- **Agent pipeline:** Intake & Triage, Evidence Analyst, Policy Advisor, Global Benchmark Agent, Scenario Evaluator, Review & Synthesis.
- **LLM:** OpenAI-compatible chat-completions endpoint, configurable through `CIVITAS_LLM_BASE_URL` and `CIVITAS_LLM_MODEL`. The current local development setup uses llama.cpp; GPU/vLLM deployment still requires validation.
- **Frontend:** Next.js 16 / React 19, under `frontend/`. Some sections are explicitly demonstration-only pending integration.
- **Knowledge:** Moderated contributions are contextual material, not independently authenticated policy evidence.

## Local development

Use Python and Node.js versions compatible with the project dependencies. Install Python dependencies into a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

Start the backend from the repository root:

```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 42515
```

Start the frontend in a separate terminal:

```bash
cd frontend
npm ci
npm run dev
```

Run the existing backend test suite:

```bash
python -m pytest -q
```

The frontend proxies API requests to the backend; check `frontend/next.config.ts` and the route handlers for the active local configuration.

## Safety and evidence integrity

- Never commit `.env` files, credentials, local databases, runtime logs, or model weights.
- A configured model endpoint does not establish that inference is available; verify its health before running investigations.
- Source verification and human review gates must not be bypassed.
- Treat international frameworks as benchmarks unless jurisdictional applicability is established.
- Do not represent simulated scenarios or draft recommendations as official government findings.

## Current development priorities

1. Replace browser-only demo cases with persisted API-backed case management.
2. Connect agent orchestration and status events to the frontend.
3. Surface citations, source eligibility, uncertainty, and human-review decisions.
4. Complete community knowledge and scenario evaluation UI flows.
5. Validate frontend lint/build, backend tests, end-to-end workflows, and GPU/vLLM operation.

Project repository: https://github.com/HR-Presents/Unicron
