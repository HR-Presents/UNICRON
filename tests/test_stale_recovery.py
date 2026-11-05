import sqlite3
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from backend.app import job_queue


class StaleRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / 'queue.db'
        with sqlite3.connect(self.path) as db:
            db.execute("""CREATE TABLE investigation_jobs (
                id TEXT PRIMARY KEY, case_id TEXT, status TEXT,
                heartbeat_at TEXT, updated_at TEXT, error_type TEXT)""")
            db.execute("""CREATE TABLE investigation_execution (
                id TEXT, case_id TEXT, status TEXT, updated_at TEXT,
                error_type TEXT)""")
            now = datetime.now(timezone.utc)
            old = (now - timedelta(minutes=10)).isoformat()
            fresh = now.isoformat()
            for jid, case, hb in [('old', 'case-a', old), ('fresh', 'case-b', fresh)]:
                db.execute("INSERT INTO investigation_jobs VALUES (?,?,?,?,?,?)",
                           (jid, case, 'running', hb, hb, None))
                db.execute("INSERT INTO investigation_execution VALUES (?,?,?,?,?)",
                           (jid, case, 'running', hb, None))
        patcher = patch.object(job_queue, 'DB_PATH', str(self.path))
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_requires_explicit_worker_shutdown_acknowledgment(self):
        with self.assertRaises(ValueError):
            job_queue.recover_stale_jobs()

    def test_only_stale_job_and_its_execution_are_interrupted(self):
        self.assertEqual(job_queue.recover_stale_jobs(90, workers_stopped=True), 1)
        with sqlite3.connect(self.path) as db:
            jobs = dict(db.execute("SELECT id,status FROM investigation_jobs"))
            executions = dict(db.execute("SELECT id,status FROM investigation_execution"))
        self.assertEqual(jobs, {'old': 'interrupted', 'fresh': 'running'})
        self.assertEqual(executions, {'old': 'failed', 'fresh': 'running'})
        self.assertEqual(job_queue.recover_stale_jobs(90, workers_stopped=True), 0)

    def test_invalid_threshold_does_not_mutate(self):
        with self.assertRaises(ValueError):
            job_queue.recover_stale_jobs(0, workers_stopped=True)


if __name__ == '__main__':
    unittest.main()
