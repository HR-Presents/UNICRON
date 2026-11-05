"""CIVITAS collaborative knowledge base: moderated, versioned contributions.

Approval is editorial moderation, not authentication of legal authority.
"""
import hmac
import os
import sqlite3
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Header, HTTPException, Query
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


def reviewer(key):
    expected = os.getenv('CIVITAS_REVIEWER_API_KEY', '')
    if not expected:
        raise HTTPException(503, 'Knowledge moderation disabled: reviewer key not configured')
    if not key or not hmac.compare_digest(key, expected):
        raise HTTPException(401, 'Valid reviewer key required')


class Contribution(BaseModel):
    title: str = Field(min_length=5, max_length=200)
    summary: str = Field(min_length=20, max_length=5000)
    domain: str = Field(min_length=2, max_length=100)
    jurisdiction: str = Field(min_length=2, max_length=100)
    contributor: str = Field(min_length=2, max_length=120)
    contributor_role: str = Field(pattern='^(student|researcher|professional|other)$')
    source_url: str | None = Field(default=None, max_length=1000)
    source_document_id: str | None = None


class Revision(BaseModel):
    title: str = Field(min_length=5, max_length=200)
    summary: str = Field(min_length=20, max_length=5000)
    editor: str = Field(min_length=2, max_length=120)
    rationale: str = Field(min_length=10, max_length=1000)


class Decision(BaseModel):
    decision: str = Field(pattern='^(approved|rejected)$')
    reviewer: str = Field(min_length=2, max_length=120)
    rationale: str = Field(min_length=15, max_length=2000)


def row_dict(row):
    return dict(row) if row else None


def get_entry(con, entry_id):
    entry = con.execute('SELECT * FROM knowledge_entries WHERE id=?', (entry_id,)).fetchone()
    if not entry:
        raise HTTPException(404, 'Knowledge entry not found')
    return entry


def verify_source_link(con, document_id):
    if document_id is None:
        return
    # Linking to evidence does not imply that the evidence is verified.
    if con.execute('SELECT 1 FROM evidence_documents WHERE id=?', (document_id,)).fetchone() is None:
        raise HTTPException(422, 'Referenced evidence document does not exist')


def source_status(con, document_id):
    if not document_id:
        return 'not_linked'
    row = con.execute('SELECT verification_status FROM source_provenance WHERE document_id=?', (document_id,)).fetchone()
    return row['verification_status'] if row else 'unregistered'


def serialize(con, entry):
    out = row_dict(entry)
    out['source_verification_status'] = source_status(con, out['source_document_id'])
    out['is_authenticated_source'] = out['source_verification_status'] == 'verified'
    return out


@router.post('/api/knowledge/contributions', status_code=201)
def submit(payload: Contribution):
    from urllib.parse import urlparse
    if payload.source_url:
        url = urlparse(payload.source_url)
        if url.scheme != 'https' or not url.hostname or url.username or url.password:
            raise HTTPException(422, 'Source URL must be HTTPS without credentials')
    with connect() as con:
        verify_source_link(con, payload.source_document_id)
        entry_id, stamp = str(uuid4()), now()
        con.execute('''INSERT INTO knowledge_entries
            (id,title,summary,domain,jurisdiction,contributor,contributor_role,source_url,source_document_id,status,version,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,'pending',1,?,?)''',
            (entry_id,payload.title,payload.summary,payload.domain,payload.jurisdiction,
             payload.contributor,payload.contributor_role,payload.source_url,payload.source_document_id,stamp,stamp))
        con.execute('''INSERT INTO knowledge_revisions (id,entry_id,version,title,summary,editor,rationale,created_at)
            VALUES (?,?,?,?,?,?,?,?)''',
            (str(uuid4()),entry_id,1,payload.title,payload.summary,payload.contributor,'Initial contribution',stamp))
        con.commit()
        return serialize(con, get_entry(con, entry_id))


@router.get('/api/knowledge')
def list_knowledge(domain: str | None = None, jurisdiction: str | None = None,
                   q: str | None = None, limit: int = Query(default=30, ge=1, le=100)):
    # Public discovery returns approved entries only.
    sql = "SELECT * FROM knowledge_entries WHERE status='approved'"
    params = []
    if domain:
        sql += ' AND domain = ? COLLATE NOCASE'
        params.append(domain)
    if jurisdiction:
        sql += ' AND jurisdiction = ? COLLATE NOCASE'
        params.append(jurisdiction)
    if q:
        sql += " AND (title LIKE ? OR summary LIKE ?)"
        term = '%' + q.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%'
        sql = sql.replace('title LIKE ? OR summary LIKE ?', "title LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\'")
        params.extend((term, term))
    sql += ' ORDER BY updated_at DESC, id LIMIT ?'
    params.append(limit)
    with connect() as con:
        return [serialize(con, row) for row in con.execute(sql, params).fetchall()]


@router.get('/api/knowledge/moderation/queue')
def queue(x_reviewer_key: str | None = Header(default=None)):
    reviewer(x_reviewer_key)
    with connect() as con:
        rows = con.execute("SELECT * FROM knowledge_entries WHERE status='pending' ORDER BY created_at, id").fetchall()
        return [serialize(con, row) for row in rows]


@router.get('/api/knowledge/{entry_id}')
def detail(entry_id: str):
    with connect() as con:
        entry = get_entry(con, entry_id)
        if entry['status'] != 'approved':
            raise HTTPException(404, 'Knowledge entry not publicly available')
        return serialize(con, entry)


@router.get('/api/knowledge/{entry_id}/history')
def history(entry_id: str, x_reviewer_key: str | None = Header(default=None)):
    reviewer(x_reviewer_key)
    with connect() as con:
        get_entry(con, entry_id)
        return [dict(row) for row in con.execute('SELECT * FROM knowledge_revisions WHERE entry_id=? ORDER BY version', (entry_id,)).fetchall()]


@router.post('/api/knowledge/{entry_id}/revisions', status_code=201)
def revise(entry_id: str, payload: Revision, x_reviewer_key: str | None = Header(default=None)):
    reviewer(x_reviewer_key)
    with connect() as con:
        entry = get_entry(con, entry_id)
        version, stamp = entry['version'] + 1, now()
        con.execute('''UPDATE knowledge_entries SET title=?,summary=?,status='pending',version=?,updated_at=?,
            moderated_by=NULL,moderation_rationale=NULL,moderated_at=NULL WHERE id=?''',
            (payload.title,payload.summary,version,stamp,entry_id))
        con.execute('''INSERT INTO knowledge_revisions (id,entry_id,version,title,summary,editor,rationale,created_at)
            VALUES (?,?,?,?,?,?,?,?)''',
            (str(uuid4()),entry_id,version,payload.title,payload.summary,payload.editor,payload.rationale,stamp))
        con.commit()
        return serialize(con, get_entry(con, entry_id))


@router.post('/api/knowledge/{entry_id}/moderate', status_code=201)
def moderate(entry_id: str, payload: Decision, x_reviewer_key: str | None = Header(default=None)):
    reviewer(x_reviewer_key)
    with connect() as con:
        entry = get_entry(con, entry_id)
        if entry['status'] != 'pending':
            raise HTTPException(409, 'Only pending entries can be moderated')
        stamp = now()
        con.execute('''UPDATE knowledge_entries SET status=?,moderated_by=?,moderation_rationale=?,moderated_at=?,updated_at=?
            WHERE id=? AND status='pending' ''',
            (payload.decision,payload.reviewer,payload.rationale,stamp,stamp,entry_id))
        con.execute('''INSERT INTO knowledge_moderation_events (id,entry_id,version,decision,reviewer,rationale,created_at)
            VALUES (?,?,?,?,?,?,?)''',
            (str(uuid4()),entry_id,entry['version'],payload.decision,payload.reviewer,payload.rationale,stamp))
        con.commit()
        return serialize(con, get_entry(con, entry_id))


def install(app, db_path):
    global DB_PATH
    DB_PATH = str(db_path)
    with connect() as con:
        con.executescript('''
            CREATE TABLE IF NOT EXISTS knowledge_entries (
              id TEXT PRIMARY KEY, title TEXT NOT NULL, summary TEXT NOT NULL,
              domain TEXT NOT NULL, jurisdiction TEXT NOT NULL, contributor TEXT NOT NULL,
              contributor_role TEXT NOT NULL, source_url TEXT, source_document_id TEXT,
              status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')),
              version INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
              moderated_by TEXT, moderation_rationale TEXT, moderated_at TEXT
            );
            CREATE TABLE IF NOT EXISTS knowledge_revisions (
              id TEXT PRIMARY KEY, entry_id TEXT NOT NULL REFERENCES knowledge_entries(id),
              version INTEGER NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL,
              editor TEXT NOT NULL, rationale TEXT NOT NULL, created_at TEXT NOT NULL,
              UNIQUE(entry_id,version)
            );
            CREATE TABLE IF NOT EXISTS knowledge_moderation_events (
              id TEXT PRIMARY KEY, entry_id TEXT NOT NULL REFERENCES knowledge_entries(id),
              version INTEGER NOT NULL, decision TEXT NOT NULL, reviewer TEXT NOT NULL,
              rationale TEXT NOT NULL, created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_knowledge_discovery
              ON knowledge_entries(status,domain,jurisdiction);
        ''')
    app.include_router(router)
