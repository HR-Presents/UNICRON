"""Question-first, citation-grounded research over a case's uploaded sources.

This is a retrieval preview, not a legal opinion or verified agent workflow.
"""
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from .evidence import connect, require_case

router = APIRouter()

class AskRequest(BaseModel):
    question: str = Field(min_length=8, max_length=1200)
    case_id: str = Field(min_length=3, max_length=100)
    limit: int = Field(default=5, ge=1, le=8)

STOP = set('what which where when does have from with that this there their about into under should would could rules laws rule law applicable apply please explain tell give show whether and are the for was were how who why can may its you your relevant requirements'.split())

@router.post('/api/ask')
def ask(request: AskRequest):
    """Return ranked, verbatim source excerpts; never invent legal applicability."""
    terms = list(dict.fromkeys(w for w in re.findall(r'[a-z]{3,}', request.question.casefold())
                               if w not in STOP))[:24]
    if not terms:
        raise HTTPException(422, 'Question needs meaningful searchable terms')
    with connect() as con:
        require_case(con, request.case_id)
        rows = con.execute('''SELECT p.document_id,p.position,p.content,d.filename
                              FROM evidence_passages p
                              JOIN evidence_documents d ON d.id=p.document_id
                              WHERE d.case_id=?''', (request.case_id,)).fetchall()
    is_uae = bool(re.search(r'\b(?:uae|united arab emirates|emirati)\b', request.question, re.I))
    is_privacy = bool(re.search(r'\b(?:privacy|personal data|data protection|consent)\b', request.question, re.I))
    ranked = []
    for row in rows:
        body = row['content']
        lower = body.casefold()
        hits = [t for t in terms if re.search(r'(?<![a-z])' + re.escape(t) + r'(?![a-z])', lower)]
        if not hits:
            continue
        # Prefer diverse matching concepts, not repetitive keyword stuffing.
        filename = row['filename'].casefold()
        score = len(hits) * 10 + min(sum(lower.count(t) for t in hits), 10)
        # Jurisdiction-aware source ranking, not a legal applicability finding.
        if is_uae and filename.startswith('uae_pdpl_'):
            score += 35 if is_privacy else 15
        elif is_uae and filename.startswith('unicron_uae_'):
            score += 10
        elif is_uae and filename.startswith('unicron_eu_'):
            score -= 15
        ranked.append((score, dict(row)))
    ranked.sort(key=lambda x: (-x[0], x[1]['filename'], x[1]['position']))
    sources = []
    families = set()
    deferred = []
    for score, row in ranked:
        name = row['filename']
        family = re.sub(r'_part\d+(?=\.)', '', name.casefold())
        if family in families:
            deferred.append((score, row))
            continue
        families.add(family)
        sources.append({'citation': f"{row['document_id']}#p{row['position']}",
                        'filename': name, 'excerpt': row['content'][:850],
                        'matched_terms': [t for t in terms if re.search(r'(?<![a-z])' + re.escape(t) + r'(?![a-z])', row['content'].casefold())],
                        'retrieval_score': score,
                        'review_status': 'not_independently_verified'})
        if len(sources) >= request.limit:
            break
    # Fill remaining capacity with additional relevant passages after
    # maximizing publication diversity; do not silently discard results.
    if len(sources) < request.limit:
        for score, row in deferred:
            sources.append({'citation': f"{row['document_id']}#p{row['position']}",
                            'filename': row['filename'], 'excerpt': row['content'][:850],
                            'matched_terms': [t for t in terms if re.search(r'(?<![a-z])' + re.escape(t) + r'(?![a-z])', row['content'].casefold())],
                            'retrieval_score': score,
                            'review_status': 'not_independently_verified'})
            if len(sources) >= request.limit:
                break
    return {
        'question': request.question,
        'case_id': request.case_id,
        'status': 'evidence_found_review_required' if sources else 'insufficient_evidence',
        'answer': ('Relevant source passages are shown below. Their applicability to your '
                   'specific situation has not been established; qualified review is required.'
                   if sources else 'No matching passages were found in this case. '
                   'Do not infer that no relevant law or policy exists.'),
        'sources': sources,
        'legal_applicability': 'not_established',
        'human_review_required': True,
        'agent_execution': 'retrieval_only',
        'limitations': ['Lexical retrieval is not legal interpretation.',
                        'Uploaded sources have not been independently verified.',
                        'No multi-agent investigation was executed by this endpoint.'],
    }

def install(app):
    app.include_router(router)
