"""Durable async investigation queue API tests without external LLM calls."""
import importlib
from fastapi.testclient import TestClient


def test_queue_is_durable_and_deduplicates_active_case(tmp_path, monkeypatch):
    monkeypatch.setenv("CIVITAS_DB_PATH", str(tmp_path / "queue.sqlite3"))
    from backend.app import main
    importlib.reload(main)
    client = TestClient(main.app)
    case = client.post("/api/cases", json={
        "title": "AI governance investigation",
        "summary": "Evaluate policy impacts across public services.",
    })
    assert case.status_code == 201, case.text
    case_id = case.json()["id"]
    url = f"/api/cases/{case_id}/investigate/async"

    first = client.post(url)
    assert first.status_code == 202, first.text
    job = first.json()
    assert job["status"] == "queued"
    assert job["case_id"] == case_id

    duplicate = client.post(url)
    assert duplicate.status_code == 202, duplicate.text
    assert duplicate.json()["id"] == job["id"]

    jobs = client.get(f"/api/cases/{case_id}/jobs")
    assert jobs.status_code == 200
    assert len(jobs.json()) == 1
    assert jobs.json()[0]["id"] == job["id"]

    detail = client.get(f"/api/cases/{case_id}/jobs/{job['id']}")
    assert detail.status_code == 200
    assert detail.json()["status"] == "queued"

    # Reinitializing the API must not lose the persisted queue.
    importlib.reload(main)
    reloaded = TestClient(main.app)
    persisted = reloaded.get(f"/api/cases/{case_id}/jobs")
    assert persisted.status_code == 200
    assert persisted.json()[0]["id"] == job["id"]


def test_queue_rejects_unknown_case(tmp_path, monkeypatch):
    monkeypatch.setenv("CIVITAS_DB_PATH", str(tmp_path / "missing-case.sqlite3"))
    from backend.app import main
    importlib.reload(main)
    client = TestClient(main.app)
    response = client.post("/api/cases/not-a-case/investigate/async")
    assert response.status_code == 404, response.text
