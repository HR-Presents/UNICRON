"""Batch regression coverage for reviewer authorization, approval gates, and queue ownership."""
import json
import os
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI, HTTPException
from backend.app import investigation, job_queue, review


class ReviewSecurityIntegrationTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        path = str(Path(temp.name) / "review.sqlite3")
        with sqlite3.connect(path) as db:
            db.execute("CREATE TABLE cases (id TEXT PRIMARY KEY)")
            db.execute("INSERT INTO cases VALUES ('case-a')")
            db.execute("CREATE TABLE audit (id TEXT PRIMARY KEY, case_id TEXT, action TEXT, detail TEXT, created_at TEXT)")
        for module in (investigation, review):
            previous = module.DB_PATH
            self.addCleanup(setattr, module, "DB_PATH", previous)
            module.install(FastAPI(), path)
        with investigation.connect() as db:
            db.execute("INSERT INTO investigation_runs VALUES (?,?,?,?)", (
                "run-a", "case-a", json.dumps({"stages": [
                    {"agent": "Evidence Analyst", "status": "source_required"}]}),
                "2026-01-01T00:00:00+00:00"))
            db.commit()
        self.valid = review.ReviewDecision(
            decision="approved", reviewer="Qualified reviewer",
            rationale="Reviewed the submitted evidence and its limitations.",
            acknowledged_limitations=True)

    def test_missing_reviewer_key_fails_closed(self):
        with patch.dict(os.environ, {"CIVITAS_REVIEWER_API_KEY": "secret"}):
            with self.assertRaises(HTTPException) as caught:
                review.submit_review("case-a", "run-a", self.valid, None)
        self.assertEqual(caught.exception.status_code, 401)

    def test_invalid_reviewer_key_fails_closed(self):
        with patch.dict(os.environ, {"CIVITAS_REVIEWER_API_KEY": "secret"}):
            with self.assertRaises(HTTPException) as caught:
                review.submit_review("case-a", "run-a", self.valid, "incorrect")
        self.assertEqual(caught.exception.status_code, 401)

    def test_unconfigured_reviewer_key_disables_approval(self):
        with patch.dict(os.environ, {"CIVITAS_REVIEWER_API_KEY": ""}):
            with self.assertRaises(HTTPException) as caught:
                review.submit_review("case-a", "run-a", self.valid, "anything")
        self.assertEqual(caught.exception.status_code, 503)

    def test_approval_requires_acknowledged_limitations(self):
        body = self.valid.model_copy(update={"acknowledged_limitations": False})
        with patch.dict(os.environ, {"CIVITAS_REVIEWER_API_KEY": "secret"}):
            with self.assertRaises(HTTPException) as caught:
                review.submit_review("case-a", "run-a", body, "secret")
        self.assertEqual(caught.exception.status_code, 422)

    def test_source_required_stage_blocks_approval_without_side_effects(self):
        with patch.dict(os.environ, {"CIVITAS_REVIEWER_API_KEY": "secret"}):
            with self.assertRaises(HTTPException) as caught:
                review.submit_review("case-a", "run-a", self.valid, "secret")
        self.assertEqual(caught.exception.status_code, 409)
        with review.connect() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM investigation_reviews").fetchone()[0], 0)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM audit").fetchone()[0], 0)

    def test_rejection_can_be_recorded_but_not_duplicated(self):
        body = self.valid.model_copy(update={"decision": "rejected"})
        with patch.dict(os.environ, {"CIVITAS_REVIEWER_API_KEY": "secret"}):
            result = review.submit_review("case-a", "run-a", body, "secret")
            self.assertEqual(result["decision"], "rejected")
            with self.assertRaises(HTTPException) as caught:
                review.submit_review("case-a", "run-a", body, "secret")
        self.assertEqual(caught.exception.status_code, 409)
        with review.connect() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM investigation_reviews").fetchone()[0], 1)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM audit").fetchone()[0], 1)


class QueueOwnershipTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        path = str(Path(temp.name) / "jobs.sqlite3")
        with sqlite3.connect(path) as db:
            db.execute("CREATE TABLE cases (id TEXT PRIMARY KEY)")
            db.execute("INSERT INTO cases VALUES ('case-a')")
        old = job_queue.DB_PATH
        self.addCleanup(setattr, job_queue, "DB_PATH", old)
        job_queue.install(FastAPI(), path)

    def test_wrong_worker_cannot_heartbeat_or_finish_job(self):
        job = job_queue.enqueue("case-a")
        claimed = job_queue.claim("worker-a")
        self.assertEqual(claimed["id"], job["id"])
        self.assertFalse(job_queue.heartbeat(job["id"], "worker-b"))
        job_queue.finish(job["id"], "worker-b", "completed", result_id="fake")
        running = job_queue.get_job("case-a", job["id"])
        self.assertEqual(running["status"], "running")
        self.assertIsNone(running["result_id"])
        job_queue.finish(job["id"], "worker-a", "completed", result_id="real")
        self.assertEqual(job_queue.get_job("case-a", job["id"])["result_id"], "real")

    def test_claimed_job_cannot_be_claimed_twice(self):
        job_queue.enqueue("case-a")
        self.assertIsNotNone(job_queue.claim("worker-a"))
        self.assertIsNone(job_queue.claim("worker-b"))


if __name__ == "__main__":
    unittest.main()
