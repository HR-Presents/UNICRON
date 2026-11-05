"""Integration tests for durable, operator-driven hypothetical scenario sessions.

Run: python -m pytest backend/tests/test_scenario_sessions.py -q
"""
import importlib
import os
from pathlib import Path

from fastapi.testclient import TestClient


def test_scenario_lifecycle_and_audit(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("CIVITAS_DB_PATH", str(tmp_path / "scenario-test.sqlite3"))
    from backend.app import main
    importlib.reload(main)
    client = TestClient(main.app)

    case = client.post("/api/cases", json={
        "title": "Service continuity exercise",
        "summary": "A hypothetical interruption to citizen services.",
        "domain": "Citizen services",
        "priority": "Medium"
    })
    assert case.status_code == 201, case.text
    cid = case.json()["id"]
    base = f"/api/cases/{cid}/scenario-sessions"

    create = client.post(base, json={
        "name": "Two-stage service exercise",
        "initial_conditions": "Public services operating normally",
        "expected_outcome": "Review the response to a disruption",
        "events": [
            {"title": "Service disruption", "description": "Hypothetical intake interruption",
             "target_agent": "Intake & Triage", "offset_seconds": 0},
            {"title": "Policy escalation", "description": "Hypothetical regulatory question",
             "target_agent": "Policy Advisor", "offset_seconds": 30}
        ]
    })
    assert create.status_code == 201, create.text
    sid = create.json()["id"]
    endpoint = f"{base}/{sid}"
    assert create.json()["status"] == "draft"
    assert client.post(endpoint + "/next").status_code == 409
    assert client.post(endpoint + "/start").json()["status"] == "running"
    assert client.post(endpoint + "/pause").json()["status"] == "paused"
    assert client.post(endpoint + "/next").status_code == 409
    assert client.post(endpoint + "/resume").json()["status"] == "running"

    first = client.post(endpoint + "/next")
    assert first.status_code == 200
    assert first.json()["cursor"] == 1
    assert first.json()["events"][0]["released_at"] is not None
    assert first.json()["events"][1]["released_at"] is None

    final = client.post(endpoint + "/next")
    assert final.json()["status"] == "completed"
    assert final.json()["cursor"] == 2
    assert client.post(endpoint + "/next").status_code == 409
    assert client.get(base).json()[0]["id"] == sid
    actions = [item["action"] for item in client.get("/api/audit").json()]
    assert "scenario.created" in actions
    assert "scenario.start" in actions
    assert "scenario.pause" in actions
    assert "scenario.resume" in actions
    assert actions.count("scenario.next") == 2


def test_invalid_scenario_is_rejected(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("CIVITAS_DB_PATH", str(tmp_path / "scenario-invalid.sqlite3"))
    from backend.app import main
    importlib.reload(main)
    client = TestClient(main.app)
    case = client.post("/api/cases", json={
        "title": "Validation case", "summary": "A valid case summary."
    }).json()
    response = client.post(f"/api/cases/{case['id']}/scenario-sessions", json={
        "name": "Invalid", "initial_conditions": "A valid condition",
        "expected_outcome": "A valid outcome", "events": []
    })
    assert response.status_code == 422
