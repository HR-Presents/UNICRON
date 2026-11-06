# UNICRON — implementation baseline and visual acceptance gate

> Historical baseline. The current Command Center and its run instructions are in [`frontend/`](frontend/).

Status: **Stage A inspected; Stages B–J not verified**. This is a repository inspection record, not a claim that the photorealistic twin is built.

## Findings from development branch

- Frontend: Next.js 16.4.5, React 19.3, TypeScript, React Three Fiber, Three.js, Drei, Rapier, GSAP and postprocessing are declared in `frontend/package.json`.
- Backend: FastAPI 0.3.0 with SQLite persistence (`backend/app/main.py`). The brief's Flask description does not match the inspected code.
- Model: `backend/app/investigation.py` uses an OpenAI-compatible HTTP `/chat/completions` endpoint; default model is `unsloth/Qwen3-1.7B-GGUF:Q4_K_M` and default URL is `http://127.0.0.1:42516/v1`. Ollama, vLLM, Qwen3:4B, and ChromaDB are **not verified** by this inspection and must not be advertised as working.
- Existing 3D implementation (`frontend/src/app/digital-twin.tsx`) uses primitive boxes and icosahedrons as buildings and agents. It is **rejected for final production visuals**. The current page is an editorial 2D interface; the 3D component is not its central rendered experience.
- Durable investigation jobs are queued/running/completed/failed/interrupted, and require a separate worker (`backend/app/job_queue.py`). **No backend pause, resume, or release-next-event endpoint was found.** A replay slider must not be represented as worker control.
- Human review (`backend/app/review.py`) validates reviewer credentials server-side, requires rationale, enforces latest-investigation review, rejects duplicate reviews, and requires explicit limitations acknowledgment for approval. It records advisory decisions, not government actions.

## Verified backend endpoint inventory (source inspection, not live HTTP tests)

| Capability | Endpoint | Frontend / remaining work |
| --- | --- | --- |
| Health | GET /api/health | Distinguish API reachability from LLM readiness |
| Cases | GET, POST /api/cases; PATCH /api/cases/{case_id} | Case library exists; validate payload and refresh behavior |
| Audit | GET /api/audit | Build filterable audit inspection and deep links |
| Summary | GET /api/summary | Do not invent metrics |
| Investigation | POST /api/cases/{case_id}/investigate | Prefer queued workflow for long jobs |
| Investigation history | GET /api/cases/{case_id}/investigations | Bind outputs to real runs |
| Execution history | GET /api/cases/{case_id}/executions | Inspect execution schema |
| Events | GET /api/cases/{case_id}/executions/{run_id}/events | Use authoritative checkpoint events for visualization |
| Durable jobs | POST /api/cases/{case_id}/investigate/async; GET /api/cases/{case_id}/jobs; GET /api/cases/{case_id}/jobs/{job_id} | Add live status, errors and interrupted-job handling |
| Evidence | GET, POST /api/cases/{case_id}/evidence; GET /api/cases/{case_id}/evidence/search; POST /api/cases/{case_id}/evidence/analyze; GET /api/cases/{case_id}/evidence/analyses | Add evidence inspector and citations |
| Provenance | GET /api/cases/{case_id}/sources; GET /api/cases/{case_id}/evidence/{document_id}/provenance; POST /api/cases/{case_id}/evidence/{document_id}/verify | Preserve verification permissions |
| Reviews | GET /api/cases/{case_id}/reviews; POST /api/cases/{case_id}/investigations/{investigation_id}/reviews | Preserve server authorization, duplicate and approval gates |
| Knowledge | GET /api/knowledge; POST /api/knowledge/contributions; GET /api/knowledge/moderation/queue; GET /api/knowledge/{entry_id}; GET /api/knowledge/{entry_id}/history; GET /api/knowledge/{entry_id}/revisions; POST /api/knowledge/{entry_id}/moderate | Add moderated knowledge views and controls |

## Visual art direction — mandatory before final 3D acceptance

**Architectural language:** Contemporary, credible civic campus with recognizably distinct civic-service, evidence, policy, simulation, and human-oversight facilities. Human-scale entrances, plausible storey heights, streets and pedestrian areas, facade rhythm, landscaping and functional circulation. No procedural box buildings as final assets.

**Asset pipeline:** Source high-quality architectural GLB/GLTF models or author originals in Blender. For every imported asset record source URL, creator, license, attribution requirements, commercial-use permissions, scale and poly/texture budgets. Never assume an internet image is a licensed 3D model. Do not add unverified assets.

**Materials and lighting:** Calibrated PBR concrete, stone, anodized metal and glass with physically plausible roughness/metalness; appropriate UVs and texture maps. HDRI ambient illumination, directional sun shadows, reflection strategy and restrained tone mapping. Avoid emissive-neon facades and gratuitous bloom.

**Composition:** Eye-level architectural hero and deliberate aerial overview; camera controls constrained to meaningful views. Department selection transitions should not obscure readability. Use clean 2D inspection surfaces for case details, evidence, review and audit.

**Agents:** Professional 2D spatial markers and workflow-linked overlays attached to actual department/agent records; do not anthropomorphize agents as glowing orbs. Real status labels are authoritative; animation is secondary and never fabricates execution.

**Palette:** Warm off-white, limestone, charcoal, muted blue-green, restrained amber only for warnings. Typography and motion must be calm, accessible and enterprise-grade.

## Hard acceptance criteria

1. Asset license manifest exists and every model loads from an explicit checked-in path.
2. Browser screenshots of actual running WebGL scene show architectural scale, credible materials, appropriate camera and lighting. Screenshots are evidence of appearance only.
3. Selection of a department, case and agent reveals matching backend records; disconnected/offline states are explicit.
4. A case moves only when confirmed backend checkpoints change. Deterministic policy state remains independent of Rapier and GSAP.
5. Scenario controls exist **only** for implemented, tested backend operations. Pause/resume/step requires new backend endpoints and durable execution semantics.
6. Reviewer action is confirmed by API response and audit entry; no simulated real-world action claims.
7. Lint, production build, backend tests, frontend integration tests, runtime network/console inspection, responsive review and performance checks have recorded results.
8. Any failure of photorealism, licensing, safety or runtime evidence blocks a completion claim.

## Immediate implementation gaps

- **Stage B:** No verified production-quality GLB assets, asset manifest, or Blender pipeline yet.
- **Stage C:** Existing primitive scene must be replaced, not polished; visual QA unperformed.
- **Stages D–E:** Backend checkpoints exist but need validated schema mapping and interaction tests.
- **Stage F:** Scenario creation, pause, resume, step, branching, comparison and export need backend designs and tests; do not fake them.
- **Stages G–H:** Evidence/provenance/review integration and meaningful physics require dedicated implementation and testing.
- **Stages I–J:** Browser/runtime verification, screenshots, performance and accessibility review remain unperformed.

## Access and evidence limitations

GitHub source inspection and commit access are available. The user's WSL `localhost:3000` and local model endpoint are not accessible from this environment. Blender is not installed in the available container. No browser run, photorealistic scene render, model call, or test result is claimed by this document.
