import unittest
from unittest.mock import patch
from fastapi import HTTPException
from backend.app import investigation

class Response:
    def __enter__(self):
        return self
    def __exit__(self, *args):
        return False

class ModelErrorPrivacyTests(unittest.TestCase):
    def test_invalid_json_redacted(self):
        with patch.object(investigation.urllib.request, "urlopen", return_value=Response()):
            with patch.object(investigation.json, "load", return_value={"choices": [{"message": {"content": "sensitive-source-text"}}]}):
                with self.assertRaises(HTTPException) as raised:
                    investigation.model_json("system", {}, "{}")
        self.assertEqual(raised.exception.status_code, 502)
        self.assertNotIn("sensitive-source-text", str(raised.exception.detail))
