"""SQLite-backed integration coverage for enqueue -> worker -> result lifecycle."""
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI
from backend.app import investigation, job_queue


class QueueIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.db_path = str(Path(self.temp.name) / "queue.sqlite3")
        with sqlite3.connect(self.db_path) as db:
            db.execute("CREATE TABLE cases (id TEXT PRIMARY KEY)")
            db.execute("INSERT INTO cases (id) VALUES ('case-a')")
            db.execute("INSERT INTO cases (id) VALUES ('case-b')")
        old_queue = job_queue.DB_PATH
        old_investigation = investigation.DB_PATH
        self.addCleanup(setattr, job_queue, "DB_PATH", old_queue)
        self.addCleanup(setattr, investigation, "DB_PATH", old_investigation)
        investigation.DB_PATH = self.db_path
        job_queue.install(FastAPI(), self.db_path)

    def test_successful_lifecycle_and_duplicate_enqueue(self):
        first = job_queue.enqueue("case-a")
        duplicate = job_queue.enqueue("case-a")
        self.assertEqual(first["id"], duplicate["id"])
        self.assertEqual(first["status"], "queued")
        with patch.object(job_queue.investigation, "run_workflow", return_value={"id": "run-a"}):
            self.assertTrue(job_queue.run_one("worker-a"))
        completed = job_queue.get_job("case-a", first["id"])
        self.assertEqual(completed["status"], "completed")
        self.assertEqual(completed["result_id"], "run-a")
        self.assertIsNone(completed["error_type"])
        self.assertFalse(job_queue.run_one("worker-a"))

    def test_failure_does_not_block_other_case(self):
        first = job_queue.enqueue("case-a")
        second = job_queue.enqueue("case-b")
        with patch.object(job_queue.investigation, "run_workflow", side_effect=ValueError("synthetic failure")):
            self.assertTrue(job_queue.run_one("worker-a"))
        failed = job_queue.get_job("case-a", first["id"])
        self.assertEqual(failed["status"], "failed")
        self.assertEqual(failed["error_type"], "ValueError")
        with patch.object(job_queue.investigation, "run_workflow", return_value={"id": "run-b"}):
            self.assertTrue(job_queue.run_one("worker-a"))
        self.assertEqual(job_queue.get_job("case-b", second["id"])["status"], "completed")


if __name__ == "__main__":
    unittest.main()
