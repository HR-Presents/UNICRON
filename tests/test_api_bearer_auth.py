"""Deployment API bearer authentication regression coverage."""
import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from backend.app.main import app


class ApiBearerAuthenticationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def request(self, method="GET", path="/api/cases", headers=None, key="test-secret"):
        with patch.dict(os.environ, {"CIVITAS_API_KEY": key}):
            return self.client.request(method, path, headers=headers or {})

    def test_missing_bearer_rejected(self):
        self.assertEqual(self.request().status_code, 401)

    def test_wrong_bearer_rejected(self):
        self.assertEqual(self.request(headers={"Authorization": "Bearer incorrect"}).status_code, 401)

    def test_basic_auth_rejected(self):
        self.assertEqual(self.request(headers={"Authorization": "Basic test-secret"}).status_code, 401)

    def test_raw_token_rejected(self):
        self.assertEqual(self.request(headers={"Authorization": "test-secret"}).status_code, 401)

    def test_correct_bearer_accepted(self):
        response = self.request(headers={"Authorization": "Bearer test-secret"})
        self.assertEqual(response.status_code, 200)

    def test_protected_write_rejected_before_validation(self):
        self.assertEqual(self.request("POST", "/api/cases").status_code, 401)

    def test_health_accessible_without_bearer(self):
        self.assertEqual(self.request(path="/api/health").status_code, 200)

    def test_options_preflight_accessible(self):
        response = self.request("OPTIONS", "/api/cases", {
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        })
        self.assertNotEqual(response.status_code, 401)

    def test_unset_key_keeps_local_development_access(self):
        with patch.dict(os.environ, {"CIVITAS_API_KEY": ""}):
            response = self.client.get("/api/cases")
        self.assertEqual(response.status_code, 200)

    def test_error_does_not_echo_secret(self):
        response = self.request(headers={"Authorization": "Bearer confidential-attempt"})
        self.assertNotIn("confidential-attempt", response.text)
        self.assertNotIn("test-secret", response.text)


if __name__ == "__main__":
    unittest.main()
