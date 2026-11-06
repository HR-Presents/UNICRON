# UNICRON

**Evidence-grounded, human-governed multi-agent intelligence for public-sector AI decisions.**

UNICRON is an experimental full-stack platform developed for the ITU AI for Good UAE hackathon. It explores domain-specific government service cases, verified policy sources, international benchmarks, moderated community knowledge, and observable AI-agent investigations.

> **Development status:** The [UNICRON Command Center](frontend/) displays saved case records and investigation checkpoints through a server-side gateway. Citizen movement on the digital twin is simulated. Qualified human review is required for policy conclusions.

## Architecture

- **Backend:** Python, FastAPI, SQLite; durable investigation queue and worker; evidence provenance, source verification, audit history, and review workflows.
- **Agent pipeline:** Intake & Triage, Evidence Analyst, Policy Advisor, Global Benchmark Agent, Scenario Evaluator, Review & Synthesis.
- **LLM:** OpenAI-compatible chat-completions endpoint, configurable through `CIVITAS_LLM_BASE_URL` and `CIVITAS_LLM_MODEL`. The current local development setup uses llama.cpp; GPU/vLLM deployment still requires validation.
- **Frontend:** Vite, React 19, React Three Fiber and Three.js in [`frontend/`](frontend/). The Command Center includes the interactive 3D twin, six-agent workbench, scenario lab and audit evidence.
- **Knowledge:** Moderated contributions are contextual material, not independently authenticated policy evidence.

## Local development

Use Python and Node.js versions compatible with the project dependencies. Install Python dependencies into a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

Install the frontend dependencies:

```bash
npm ci --prefix frontend
```

Run `./start.sh` from the repository root to start the loopback API, investigation worker and frontend. The script prints the frontend URL. Configure the separate model service as described in [the backend handoff](BACKEND_HANDOFF.md) before running investigations.

To run the processes separately, start the API from the repository root:

```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 42515
```

Start the investigation worker from the same directory in a second terminal, with the same model and database configuration:

```bash
python -m backend.app.job_queue
```

Start the frontend in a third terminal:

```bash
cd frontend
npm run dev
```

Run the existing backend test suite:

```bash
python -m pytest -q
```

The local frontend gateway connects to the backend on port 42515 by default. See [the frontend configuration](frontend/.env.example) for server-side overrides and AI Desk settings. Run `npm test --prefix frontend` and `npm run build --prefix frontend` to validate the frontend.

## Safety and evidence integrity

- Never commit `.env` files, credentials, local databases, runtime logs, or model weights.
- A configured model endpoint does not establish that inference is available; verify its health before running investigations.
- Source verification and human review gates must not be bypassed.
- Treat international frameworks as benchmarks unless jurisdictional applicability is established.
- Do not represent simulated scenarios or draft recommendations as official government findings.

## Current development priorities

1. Validate all six agents against a real model and verified sources.
2. Evaluate retrieval quality, citation accuracy and human review across multiple exercise scenarios.
3. Validate GPU/vLLM operation and prepare the ITU alignment evidence.

Project repository: https://github.com/HR-Presents/Unicron
