"""API integration checks for the public UNICRON investigation intake."""
import importlib

from fastapi.testclient import TestClient


def test_intake_case_persists_and_is_audited(tmp_path, monkeypatch):
    monkeypatch.setenv("CIVITAS_DB_PATH", str(tmp_path / "intake.sqlite3"))
    from backend.app import main
    importlib.reload(main)
    client = TestClient(main.app)

    payload = {
        "title": "Cross-border public service policy review",
        "summary": "Evaluate governance and evidence for a public service AI proposal.",
        "domain": "Government Services",
        "priority": "Medium",
    }
    response = client.post("/api/cases", json=payload)
    assert response.status_code == 201, response.text
    case = response.json()
    assert case["id"].startswith("CIV-")
    assert all(case[key] == value for key, value in payload.items())
    assert case["status"] == "New"

    cases = client.get("/api/cases")
    assert cases.status_code == 200
    assert any(item["id"] == case["id"] for item in cases.json())
    audit = client.get("/api/audit")
    assert audit.status_code == 200
    assert any(item["case_id"] == case["id"] and item["action"] == "case.created"
               for item in audit.json())


def test_intake_rejects_invalid_inputs(tmp_path, monkeypatch):
    monkeypatch.setenv("CIVITAS_DB_PATH", str(tmp_path / "invalid-intake.sqlite3"))
    from backend.app import main
    importlib.reload(main)
    client = TestClient(main.app)
    invalid = [
        {"title": "No", "summary": "Enough context", "domain": "Education"},
        {"title": "Valid title", "summary": "No", "domain": "Education"},
        {"title": "Valid title", "summary": "Enough context", "priority": "Critical"},
    ]
    for payload in invalid:
        result = client.post("/api/cases", json=payload)
        assert result.status_code == 422, result.text
    assert client.get("/api/cases").json() == []
