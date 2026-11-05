# CIVITAS Phase 6 — Conservative source-backed policy intelligence

## Scope
- Policy Advisor: displays verbatim policy-labelled source excerpts with citation identifiers. **Does not authenticate uploads or issue legal conclusions.**
- Global Benchmark: displays jurisdiction-labelled benchmark excerpts; requires at least two jurisdictions for review-ready status. **Does not automatically infer a comparative policy recommendation.**
- Existing Phase 5 endpoints, database schema, and case history are preserved.
- New test suite covers missing sources, policy review, benchmark jurisdiction gating, and unlabelled uploads.

## Installation (Ubuntu WSL)
1. Back up your project: `cp -a ~/Projects/CIVITAS ~/Projects/CIVITAS-backup-phase6`
2. Extract the package into the project root: `unzip -o /mnt/c/Users/<WINDOWS_USER>/Downloads/CIVITAS-phase6-safe-update.zip -d ~/Projects/CIVITAS` (adjust ZIP location).
3. `cd ~/Projects/CIVITAS && source .venv/bin/activate`
4. `python3 -m compileall -q backend/app`
5. `python3 -m unittest discover -s tests -p 'test_policy_intelligence.py' -v`
6. Restart FastAPI on 42515; keep llama.cpp on 42516 running.
7. Run POST `/api/cases/<id>/investigate`, then GET `/api/cases/<id>/investigations`.

## Evidence metadata
For policy excerpts, upload via existing evidence API with `source_note` containing `policy`, e.g. `policy; publisher=...; jurisdiction=UAE; effective_date=...; verification=pending`.
For benchmark excerpts, use `benchmark; country=UAE; publisher=...` and a second document `benchmark; country=Singapore; publisher=...`.
Metadata is self-declared, and these strings **do not establish source authenticity**. Validate original publications and legal applicability before any operational use.

## Known limitations
- Source extraction is deterministic, not a semantic/legal analysis agent.
- Relevant excerpts are lexical matches, not guaranteed to entail any proposed claim.
- Benchmark comparison is intentionally `null` pending human review.
- Phase 5 scenario and synthesis agents may still make unsupported assertions; do not treat them as verified.
- No authentication/authorization system is implemented; do not expose this prototype publicly or use sensitive citizen data.
- Tests are local unit tests; actual WSL API and llama.cpp end-to-end operation must be verified by the user.
