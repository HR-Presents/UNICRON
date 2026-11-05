"""Worker errors are sanitized even when exception chains contain private evidence."""
import io
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

from backend.app import job_queue


class FakeThread:
    def __init__(self, *args, **kwargs):
        self.started = False
        self.joined = False

    def start(self):
        self.started = True

    def join(self, timeout=None):
        self.joined = True


class WorkerLogPrivacyTests(unittest.TestCase):
    def test_failed_worker_does_not_log_sensitive_exception_or_cause(self):
        job = {"id": "job-privacy", "case_id": "case-privacy"}
        finished = []
        def fail(_case_id):
            try:
                raise ValueError("PRIVATE_SOURCE_TEXT")
            except ValueError as cause:
                raise RuntimeError("PRIVATE_MODEL_OUTPUT") from cause

        output = io.StringIO()
        with patch.object(job_queue, "claim", return_value=job), \
             patch.object(job_queue.investigation, "run_workflow", side_effect=fail), \
             patch.object(job_queue, "finish", side_effect=lambda *args, **kwargs: finished.append((args, kwargs))), \
             patch.object(job_queue.threading, "Thread", FakeThread), \
             redirect_stdout(output):
            self.assertTrue(job_queue.run_one("worker-a"))
        self.assertEqual(finished[0][0][2], "failed")
        self.assertEqual(finished[0][1]["error_type"], "RuntimeError")
        self.assertIn("RuntimeError", output.getvalue())
        self.assertNotIn("PRIVATE_SOURCE_TEXT", output.getvalue())
        self.assertNotIn("PRIVATE_MODEL_OUTPUT", output.getvalue())

    def test_successful_worker_records_result(self):
        job = {"id": "job-success", "case_id": "case-success"}
        finished = []
        with patch.object(job_queue, "claim", return_value=job), \
             patch.object(job_queue.investigation, "run_workflow", return_value={"id": "run-success"}), \
             patch.object(job_queue, "finish", side_effect=lambda *args, **kwargs: finished.append((args, kwargs))), \
             patch.object(job_queue.threading, "Thread", FakeThread), \
             redirect_stdout(io.StringIO()):
            self.assertTrue(job_queue.run_one("worker-a"))
        self.assertEqual(finished[0][0][2], "completed")
        self.assertEqual(finished[0][1]["result_id"], "run-success")


if __name__ == "__main__":
    unittest.main()
