"""API summary must reflect durable queue state, not a hardcoded zero."""
import sqlite3
import tempfile
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

from backend.app import main


class SummaryRuntimeTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.path = Path(tmp.name) / "summary.sqlite3"
        with sqlite3.connect(self.path) as db:
            db.execute("CREATE TABLE cases (id TEXT, status TEXT, priority TEXT)")
            db.execute("CREATE TABLE evidence_documents (id TEXT)")
            db.execute("CREATE TABLE investigation_jobs (id TEXT, status TEXT)")
            db.executemany("INSERT INTO cases VALUES (?,?,?)", [
                ("a", "New", "High"), ("b", "Resolved", "Low")])
            db.executemany("INSERT INTO investigation_jobs VALUES (?,?)", [
                ("one", "running"), ("two", "queued"), ("three", "completed")])

        @contextmanager
        def test_db():
            with sqlite3.connect(self.path) as con:
                yield con

        self.patcher = patch.object(main, "db", test_db)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)

    def test_summary_counts_only_running_jobs(self):
        result = main.summary()
        self.assertEqual(result["agents_running"], 1)
        self.assertEqual(result["total_cases"], 2)
        self.assertEqual(result["active_cases"], 1)

    def test_summary_updates_when_job_finishes(self):
        with sqlite3.connect(self.path) as db:
            db.execute("UPDATE investigation_jobs SET status='completed' WHERE id='one'")
        self.assertEqual(main.summary()["agents_running"], 0)


if __name__ == "__main__":
    unittest.main()
