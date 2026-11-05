"""Phase 7 human oversight: advisory review decisions, never automated government action."""
import hashlib
import hmac
import json
import os
import sqlite3
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()
DB_PATH = None


def now():
    return datetime.now(timezone.utc).isoformat()


def connect():
    db = sqlite3.connect(DB_PATH, timeout=20)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    return db


class ReviewDecision(BaseModel):
    decision: str = Field(pattern='^(approved|rejected|changes_requested)$')
    reviewer: str = Field(min_length=2, max_length=120)
    rationale: str = Field(min_length=10, max_length=2000)
    acknowledged_limitations: bool = False


def require_reviewer(key):
    expected = os.environ.get('CIVITAS_REVIEWER_API_KEY', '')
    if not expected:
        raise HTTPException(503, 'Human review disabled: configure CIVITAS_REVIEWER_API_KEY before starting API')
    if not key or not hmac.compare_digest(key, expected):
        raise HTTPException(401, 'Invalid reviewer credential')


def require_case(db, case_id):
    if not db.execute('SELECT 1 FROM cases WHERE id=?', (case_id,)).fetchone():
        raise HTTPException(404, 'Case not found')


@router.get('/api/cases/{case_id}/reviews')
def list_reviews(case_id: str):
    with connect() as db:
        require_case(db, case_id)
        rows = db.execute('''SELECT id,case_id,investigation_id,decision,reviewer,rationale,
            acknowledged_limitations,created_at FROM investigation_reviews
            WHERE case_id=? ORDER BY created_at DESC,id DESC''', (case_id,)).fetchall()
        reviews = [dict(row) for row in rows]
        for review in reviews:
            review['acknowledged_limitations'] = bool(
                review['acknowledged_limitations']
            )
        return reviews


@router.post('/api/cases/{case_id}/investigations/{investigation_id}/reviews', status_code=201)
def submit_review(case_id: str, investigation_id: str, body: ReviewDecision,
                  x_reviewer_key: str | None = Header(default=None)):
    require_reviewer(x_reviewer_key)
    if body.decision == 'approved' and not body.acknowledged_limitations:
        raise HTTPException(422, 'Approval requires explicit acknowledgement of investigation limitations')
    stamp, review_id = now(), str(uuid4())
    with connect() as db:
        db.execute('BEGIN IMMEDIATE')
        require_case(db, case_id)
        row = db.execute('SELECT result_json FROM investigation_runs WHERE id=? AND case_id=?',
                         (investigation_id, case_id)).fetchone()
        if not row:
            raise HTTPException(404, 'Investigation not found for this case')
        latest = db.execute('SELECT id FROM investigation_runs WHERE case_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1',
                            (case_id,)).fetchone()
        if not latest or latest['id'] != investigation_id:
            raise HTTPException(409, 'Only the latest investigation may receive a new review')
        previous = db.execute('SELECT 1 FROM investigation_reviews WHERE investigation_id=?',
                              (investigation_id,)).fetchone()
        if previous:
            raise HTTPException(409, 'Investigation already reviewed; run a new investigation for a new decision')
        investigation = json.loads(row['result_json'])
        if body.decision == 'approved':
            blocked = [s['agent'] for s in investigation.get('stages', [])
                       if s.get('status') not in ('completed', 'review_required')]
            if blocked:
                raise HTTPException(409, 'Cannot approve investigation with incomplete or source-required stages: ' + ', '.join(blocked))
        db.execute('''INSERT INTO investigation_reviews
            (id,case_id,investigation_id,decision,reviewer,rationale,acknowledged_limitations,created_at)
            VALUES (?,?,?,?,?,?,?,?)''',
            (review_id, case_id, investigation_id, body.decision, body.reviewer,
             body.rationale, int(body.acknowledged_limitations), stamp))
        detail = json.dumps({'review_id':review_id,'investigation_id':investigation_id,
                             'decision':body.decision,'reviewer':body.reviewer}, ensure_ascii=False)
        db.execute('INSERT INTO audit (id,case_id,action,detail,created_at) VALUES (?,?,?,?,?)',
                   (str(uuid4()), case_id, 'review.decision_recorded', detail, stamp))
        db.commit()
    return {'id':review_id,'case_id':case_id,'investigation_id':investigation_id,
            'decision':body.decision,'reviewer':body.reviewer,'rationale':body.rationale,
            'acknowledged_limitations':body.acknowledged_limitations,'created_at':stamp,
            'scope':'advisory investigation review only; no case resolution or government action executed'}


def install(app, db_path):
    global DB_PATH
    DB_PATH = str(db_path)
    with connect() as db:
        db.execute('''CREATE TABLE IF NOT EXISTS investigation_reviews (
            id TEXT PRIMARY KEY, case_id TEXT NOT NULL, investigation_id TEXT NOT NULL UNIQUE,
            decision TEXT NOT NULL CHECK(decision IN ('approved','rejected','changes_requested')),
            reviewer TEXT NOT NULL, rationale TEXT NOT NULL,
            acknowledged_limitations INTEGER NOT NULL, created_at TEXT NOT NULL,
            FOREIGN KEY(case_id) REFERENCES cases(id),
            FOREIGN KEY(investigation_id) REFERENCES investigation_runs(id))''')
        db.commit()
    app.include_router(router)
