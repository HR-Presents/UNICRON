# UNICRON 3D frontend — development integration

This implementation is an immersive **simulation visualization** backed by the existing UNICRON/CIVITAS API. It is not connected to live government systems.

## Install and run (WSL)

```bash
cd ~/Projects/CIVITAS
git checkout development
git pull --ff-only origin development
cd frontend
npm install
npm run lint
npm run build
npm run dev
```

Open http://localhost:3000 in a WebGL2-capable browser.

In separate terminals, start the existing FastAPI service and investigation worker:

```bash
cd ~/Projects/CIVITAS
source .venv/bin/activate
uvicorn backend.app.main:app --host 127.0.0.1 --port 42515
```

```bash
cd ~/Projects/CIVITAS
source .venv/bin/activate
python -m backend.app.job_queue
```

The existing local LLM endpoint must also be running for LLM-backed investigation stages. Check `curl -i http://127.0.0.1:42515/api/health` and `curl -i http://127.0.0.1:3000/api/cases`.

## Backend contract

- GET/POST `/api/cases` — persisted case selection and creation
- POST `/api/cases/:id/investigate/async` — enqueue a **real** investigation
- GET `/api/cases/:id/jobs` — worker status
- GET `/api/cases/:id/executions` and `/api/cases/:id/executions/:runId/events` — recorded stage checkpoints
- GET `/api/cases/:id/investigations` — persisted agent outputs
- GET `/api/cases/:id/reviews` and POST `/api/cases/:id/investigations/:investigationId/reviews` — protected human review
- GET `/api/audit` — recorded actions

The 3D objects represent conceptual government departments and existing case records. Agent movement and node status are based on recorded stage checkpoints, **not** claims of autonomous tool-to-tool message transport. No GLB assets are shipped yet; architecture uses native 3D geometry.

## Important limitations

- The existing worker does not provide pause/resume, arbitrary scenario-event injection, or cancellation. The **Pause replay** control only pauses playback of historical events.
- No simulation outcome is invented when the backend has not generated one.
- A completed build does not establish runtime correctness. Confirm browser WebGL, worker progress, stage results, and review behavior manually.
- Review credentials are submitted per request and are not persisted in browser storage; the backend enforces review authorization and approval limitations.
- Physics currently applies to the fixed government environment; moving case objects are rendered with Three.js. Dynamic collision-based request handoffs remain to be implemented.
- The current implementation uses generated PBR geometry, not optimized GLTF/GLB assets or authored HDRI files.
- Browser GPU support, animation performance, and responsive usability require device testing.

## Acceptance checks

1. `npm install`, `npm run lint`, `npm run build` pass.
2. The canvas renders actual WebGL and responds to orbit, pan and zoom.
3. Selecting a case changes the selected case and request object.
4. Clicking an agent changes the inspector.
5. Clicking a department focuses the camera with a GSAP transition.
6. Starting an investigation creates a queued job in the backend.
7. Running the worker generates persisted events and the UI reflects them.
8. Replay controls move through recorded event history without changing backend job state.
9. Human review is rejected without a valid reviewer key; valid submissions follow backend safeguards.
10. No UI action executes real government decisions.

If installation or build fails, preserve the exact terminal output and resolve the dependency/type error before evaluating the interface.
