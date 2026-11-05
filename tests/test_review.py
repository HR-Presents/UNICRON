"""Isolated tests: no real CIVITAS database or LLM needed."""
import json
import os
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from backend.app import review


class HumanReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.old_path = review.DB_PATH
        review.DB_PATH = str(Path(self.temp.name) / 'review.sqlite3')
        with review.connect() as db:
            db.execute('CREATE TABLE cases (id TEXT PRIMARY KEY)')
            db.execute('CREATE TABLE investigation_runs (id TEXT PRIMARY KEY, case_id TEXT, result_json TEXT, created_at TEXT)')
            db.execute('CREATE TABLE audit (id TEXT,case_id TEXT,action TEXT,detail TEXT,created_at TEXT)')
            db.execute('INSERT INTO cases VALUES (?)', ('CASE-1',))
            db.execute('INSERT INTO investigation_runs VALUES (?,?,?,?)', ('RUN-1','CASE-1',json.dumps({'stages':[{'agent':'Policy Advisor','status':'source_required'}]}),'2026-11-05'))
            db.execute('''CREATE TABLE investigation_reviews (
                id TEXT PRIMARY KEY, case_id TEXT, investigation_id TEXT UNIQUE,
                decision TEXT, reviewer TEXT, rationale TEXT,
                acknowledged_limitations INTEGER, created_at TEXT)''')
            db.commit()

    def tearDown(self):
        review.DB_PATH = self.old_path
        self.temp.cleanup()

    def test_review_key_required(self):
        with patch.dict(os.environ, {'CIVITAS_REVIEWER_API_KEY':'test-secret'}):
            with self.assertRaises(HTTPException) as cm:
                review.require_reviewer('wrong')
            self.assertEqual(cm.exception.status_code, 401)

    def test_no_default_credentials(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(HTTPException) as cm:
                review.require_reviewer(None)
            self.assertEqual(cm.exception.status_code, 503)

    def test_approval_blocked_when_source_required(self):
        body = review.ReviewDecision(decision='approved',reviewer='Test Reviewer',
                rationale='Reviewed all currently supplied evidence.',acknowledged_limitations=True)
        with patch.dict(os.environ, {'CIVITAS_REVIEWER_API_KEY':'test-secret'}):
            with self.assertRaises(HTTPException) as cm:
                review.submit_review('CASE-1','RUN-1',body,x_reviewer_key='test-secret')
            self.assertEqual(cm.exception.status_code,409)

    def test_reject_persists_and_is_immutable(self):
        body = review.ReviewDecision(decision='changes_requested',reviewer='Test Reviewer',
                rationale='Please provide independently verifiable policy sources.')
        with patch.dict(os.environ, {'CIVITAS_REVIEWER_API_KEY':'test-secret'}):
            saved = review.submit_review('CASE-1','RUN-1',body,x_reviewer_key='test-secret')
            self.assertEqual(saved['decision'],'changes_requested')
            rows = review.list_reviews('CASE-1')
            self.assertEqual(len(rows),1)
            with self.assertRaises(HTTPException) as cm:
                review.submit_review('CASE-1','RUN-1',body,x_reviewer_key='test-secret')
            self.assertEqual(cm.exception.status_code,409)
            with review.connect() as db:
                self.assertEqual(db.execute('SELECT COUNT(*) FROM audit').fetchone()[0],1)

    def test_approval_requires_acknowledgement(self):
        body = review.ReviewDecision(decision='approved',reviewer='Test Reviewer',
                rationale='I reviewed the supporting evidence carefully.')
        with patch.dict(os.environ, {'CIVITAS_REVIEWER_API_KEY':'test-secret'}):
            with self.assertRaises(HTTPException) as cm:
                review.submit_review('CASE-1','RUN-1',body,x_reviewer_key='test-secret')
            self.assertEqual(cm.exception.status_code,422)


if __name__ == '__main__':
    unittest.main()
