"""Read-only stale worker detection tests."""
import sqlite3
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from backend.app import job_queue


class StaleWorkerReportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'jobs.sqlite3'
        with sqlite3.connect(self.path) as db:
            db.execute("""CREATE TABLE investigation_jobs (
                id TEXT, case_id TEXT, worker_id TEXT, status TEXT,
                heartbeat_at TEXT, updated_at TEXT, created_at TEXT)""")
        self.db_patch = patch.object(job_queue, 'DB_PATH', str(self.path))
        self.db_patch.start()
        self.addCleanup(self.db_patch.stop)

    def test_only_stale_running_jobs_reported_without_mutation(self):
        at = datetime(2026, 11, 5, 12, 0, tzinfo=timezone.utc)
        old = (at - timedelta(seconds=120)).isoformat()
        fresh = (at - timedelta(seconds=5)).isoformat()
        with sqlite3.connect(self.path) as db:
            for job_id, status, heartbeat in [
                ('stale', 'running', old),
                ('fresh', 'running', fresh),
                ('missing', 'running', None),
                ('done', 'completed', old),
            ]:
                db.execute("INSERT INTO investigation_jobs VALUES (?,?,?,?,?,?,?)",
                           (job_id, 'case', 'worker', status, heartbeat, old, old))
        result = job_queue.stale_running_jobs(90, at)
        self.assertEqual({row['id'] for row in result}, {'stale', 'missing'})
        with sqlite3.connect(self.path) as db:
            self.assertEqual(db.execute(
                "SELECT COUNT(*) FROM investigation_jobs WHERE status='running'"
            ).fetchone()[0], 3)

    def test_invalid_threshold_rejected(self):
        with self.assertRaises(ValueError):
            job_queue.stale_running_jobs(0)


if __name__ == '__main__':
    unittest.main()
