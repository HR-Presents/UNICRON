# UNICRON Command Center

Private government-services exercise workspace. The civic district, incident timeline and six-agent workbench display recorded case activity. Cases, evidence and agent output come from the authenticated server-side gateway.

## Digital twin

Use the Camera menu for overview, street level or overhead views. Select a department to focus it, or enable Follow activity to track the active investigation. Citizen flow shows three illustrative exercise routes through the campus, with moving beads between the pedestrian markers to make the direction easier to see. Recorded agent handoffs are drawn from the current run's saved cross-department checkpoints. Use the campus plan as a lightweight alternative or the global Motion control to pause animation.

## Backend contract

Source reviewed at `HR-Presents/Unicron@fd2afc03eba58e2cf569998320404820693a8607`. The API and investigation queue worker use a dedicated exercise database. The model service is separate. The worker records six investigation checkpoints. The policy stage is extractive, while the benchmark stage builds a verified-source evidence matrix and can request a model draft when prerequisites are met.

- Case intake and evidence attachment use the project API.
- Triage and evidence analysis support standalone runs. The agent workbench also displays persisted outputs from the complete investigation.
- Scenario sessions release operator-authored hypothetical events in sequence. Approval and source verification require a qualified reviewer and the upstream's review rules.
- The optional follow-up desk answers within the chosen role using evidence passages or a recorded stage. Policy questions require verified policy sources. Benchmark questions require verified passages from multiple jurisdictions. Follow-ups are distinct from saved investigation checkpoints.
- The audit snapshot includes a SHA-256 export integrity check. The Readiness score is based on available case records.

## Run and validate

Use the environment names in `.env.example` on the server. Hosted requests require an authenticated site visitor and a secured HTTPS API origin with its bearer credential. Protected review writes require a server-side reviewer token and the specific authorized site user ID. Raw upstream failures, worker identifiers, trace fields and reviewer credentials stay behind the gateway. Use a dedicated exercise database with public or approved evidence.

Start FastAPI and the queue worker according to GitHub's `BACKEND_HANDOFF.md`. Then run `npm ci`, `npm test`, `npm run dev` or `npm run build`. The dev gateway runs locally. The build creates an ESM Worker and assets for private hosting. ITU Lab vector ingestion, Sandbox evaluation and actual model quality remain separate validation steps.


## GitHub import

Place this complete directory at `command-center/` beside the existing `backend/` and `frontend/` directories. It has its own Node manifest and lockfile and does not replace the repository's existing frontend. All 3D models and motion are defined in the source. Provide runtime credentials and exercise data separately through the deployment environment. Private production hosting requires an authenticated server-side gateway. The Sites Worker uses verified Sites identity, so moving to another hosting provider requires adapting that identity check.
