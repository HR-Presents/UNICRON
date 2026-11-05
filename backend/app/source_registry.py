"""CIVITAS Phase 8: provenance registry and explicit human verification."""
import hmac
import os
import sqlite3
from datetime import datetime, timezone
from uuid import uuid4
from urllib.parse import urlparse

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()
DB_PATH = None


def connect():
    con = sqlite3.connect(DB_PATH, timeout=20)
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA foreign_keys=ON')
    return con


def now():
    return datetime.now(timezone.utc).isoformat()


def require_reviewer(key):
    expected = os.getenv('CIVITAS_REVIEWER_API_KEY', '')
    if not expected:
        raise HTTPException(503, 'Source verification disabled: configure CIVITAS_REVIEWER_API_KEY')
    if not key or not hmac.compare_digest(key, expected):
        raise HTTPException(401, 'Valid reviewer key required')


class SourceMetadata(BaseModel):
    authority: str = Field(min_length=2, max_length=180)
    jurisdiction: str = Field(min_length=2, max_length=100)
    document_title: str = Field(min_length=3, max_length=250)
    official_url: str = Field(min_length=10, max_length=1000)
    publication_date: str | None = None
    effective_date: str | None = None
    source_type: str = Field(pattern='^(policy|benchmark|guidance|other)$')


class VerificationDecision(BaseModel):
    decision: str = Field(pattern='^(verified|rejected)$')
    reviewer: str = Field(min_length=2, max_length=180)
    rationale: str = Field(min_length=15, max_length=2000)
    checked_url: bool
    checked_authority: bool
    checked_document: bool


def require_document(con, case_id, document_id):
    row = con.execute('SELECT * FROM evidence_documents WHERE id=? AND case_id=?', (document_id, case_id)).fetchone()
    if row is None:
        raise HTTPException(404, 'Evidence document not found for case')
    return row


def metadata_row(row):
    result = dict(row)
    result['is_verified'] = result['verification_status'] == 'verified'
    return result


@router.put('/api/cases/{case_id}/evidence/{document_id}/provenance')
def register_provenance(case_id: str, document_id: str, payload: SourceMetadata, x_reviewer_key: str | None = Header(default=None)):
    require_reviewer(x_reviewer_key)
    parsed = urlparse(payload.official_url)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
        raise HTTPException(422, 'Official URL must be an HTTPS URL without embedded credentials')
    for field in ('publication_date', 'effective_date'):
        value = getattr(payload, field)
        if value:
            try:
                from datetime import date
                date.fromisoformat(value)
            except ValueError:
                raise HTTPException(422, f'{field} must be YYYY-MM-DD')
    with connect() as con:
        require_document(con, case_id, document_id)
        existing = con.execute('SELECT * FROM source_provenance WHERE document_id=?', (document_id,)).fetchone()
        if existing and existing['verification_status'] != 'unverified':
            raise HTTPException(409, 'Reviewed provenance is immutable; upload a new document for a new review')
        if existing:
            raise HTTPException(409, 'Provenance already registered; upload a new document to correct metadata')
        stamp = now()
        con.execute('''INSERT INTO source_provenance
            (document_id,authority,jurisdiction,document_title,official_url,publication_date,effective_date,source_type,verification_status,created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?)''',
            (document_id,payload.authority,payload.jurisdiction,payload.document_title,payload.official_url,
             payload.publication_date,payload.effective_date,payload.source_type,'unverified',stamp))
        con.execute('INSERT INTO audit (id,case_id,action,detail,created_at) VALUES (?,?,?,?,?)',
                    (str(uuid4()),case_id,'source.provenance_registered',f'document={document_id}; status=unverified',stamp))
        con.commit()
        return metadata_row(con.execute('SELECT * FROM source_provenance WHERE document_id=?', (document_id,)).fetchone())


@router.get('/api/cases/{case_id}/sources')
def list_sources(case_id: str):
    with connect() as con:
        if con.execute('SELECT 1 FROM cases WHERE id=?', (case_id,)).fetchone() is None:
            raise HTTPException(404, 'Case not found')
        rows = con.execute('''SELECT p.* FROM source_provenance p JOIN evidence_documents d ON d.id=p.document_id
                              WHERE d.case_id=? ORDER BY p.created_at DESC''', (case_id,)).fetchall()
        return [metadata_row(row) for row in rows]


@router.post('/api/cases/{case_id}/evidence/{document_id}/verify', status_code=201)
def verify_source(case_id: str, document_id: str, decision: VerificationDecision, x_reviewer_key: str | None = Header(default=None)):
    require_reviewer(x_reviewer_key)
    if decision.decision == 'verified' and not (decision.checked_url and decision.checked_authority and decision.checked_document):
        raise HTTPException(422, 'Verification requires all three independent checks')
    with connect() as con:
        require_document(con, case_id, document_id)
        source = con.execute('SELECT * FROM source_provenance WHERE document_id=?', (document_id,)).fetchone()
        if source is None:
            raise HTTPException(404, 'Register provenance before verification')
        if source['verification_status'] != 'unverified':
            raise HTTPException(409, 'Source decision already recorded; immutable')
        stamp = now()
        con.execute('''UPDATE source_provenance SET verification_status=?,verified_by=?,verification_rationale=?,verified_at=?
                       WHERE document_id=? AND verification_status='unverified' ''',
                    (decision.decision,decision.reviewer,decision.rationale,stamp,document_id))
        con.execute('INSERT INTO audit (id,case_id,action,detail,created_at) VALUES (?,?,?,?,?)',
                    (str(uuid4()),case_id,'source.verification_recorded',f'document={document_id}; decision={decision.decision}; reviewer={decision.reviewer}',stamp))
        con.commit()
        return metadata_row(con.execute('SELECT * FROM source_provenance WHERE document_id=?', (document_id,)).fetchone())


def install(app, db_path):
    global DB_PATH
    DB_PATH = str(db_path)
    with connect() as con:
        con.execute('''CREATE TABLE IF NOT EXISTS source_provenance (
            document_id TEXT PRIMARY KEY REFERENCES evidence_documents(id),
            authority TEXT NOT NULL, jurisdiction TEXT NOT NULL, document_title TEXT NOT NULL,
            official_url TEXT NOT NULL, publication_date TEXT, effective_date TEXT,
            source_type TEXT NOT NULL, verification_status TEXT NOT NULL DEFAULT 'unverified',
            verified_by TEXT, verification_rationale TEXT, verified_at TEXT, created_at TEXT NOT NULL)''')
        con.commit()
    app.include_router(router)
