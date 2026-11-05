"""Worker lifecycle integration checks using a controlled workflow stub.

These tests exercise the real durable SQLite queue and worker orchestration.
They do not claim to validate an external LLM or actual agent reasoning.
"""
import importlib

from fastapi.testclient import TestClient


def setup_case(tmp_path, monkeypatch):
    monkeypatch.setenv("CIVITAS_DB_PATH", str(tmp_path / "worker.sqlite3"))
    from backend.app import main
    importlib.reload(main)
    from backend.app import job_queue
    client = TestClient(main.app)
    case = client.post("/api/cases", json={
        "title": "Cross-border AI policy evaluation",
        "summary": "Evaluate evidence and regulatory implications.",
    })
    assert case.status_code == 201, case.text
    case_id = case.json()["id"]
    queued = client.post(f"/api/cases/{case_id}/investigate/async")
    assert queued.status_code == 202, queued.text
    return client, case_id, queued.json()["id"], job_queue


def test_worker_completes_job_and_persists_result_id(tmp_path, monkeypatch):
    client, case_id, job_id, queue = setup_case(tmp_path, monkeypatch)
    observed = []
    def workflow(cid):
        observed.append(cid)
        return {"id": "test-investigation-result"}
    monkeypatch.setattr(queue.investigation, "run_workflow", workflow)

    assert queue.run_one("test-worker") is True
    assert observed == [case_id]
    result = client.get(f"/api/cases/{case_id}/jobs/{job_id}")
    assert result.status_code == 200
    assert result.json()["status"] == "completed"
    assert result.json()["result_id"] == "test-investigation-result"
    assert queue.run_one("test-worker") is False


def test_worker_failure_records_error_without_fake_success(tmp_path, monkeypatch):
    client, case_id, job_id, queue = setup_case(tmp_path, monkeypatch)
    def broken_workflow(_cid):
        raise RuntimeError("controlled failure")
    monkeypatch.setattr(queue.investigation, "run_workflow", broken_workflow)

    assert queue.run_one("failure-test-worker") is True
    result = client.get(f"/api/cases/{case_id}/jobs/{job_id}")
    assert result.status_code == 200
    assert result.json()["status"] == "failed"
    assert result.json()["error_type"] == "RuntimeError"
    assert result.json()["result_id"] is None
