"""Read-only, bounded discovery of moderated community context.

Community moderation is NOT evidence verification. Entries are never converted
into evidence passages or used to satisfy policy/benchmark source requirements.
"""
import re

STOP = {'about', 'after', 'before', 'could', 'from', 'have', 'into', 'other', 'their', 'there', 'these', 'those', 'with', 'would', 'case', 'public', 'service', 'services', 'government'}


def terms(value):
    return {w for w in re.findall(r'[a-z]{4,}', (value or '').casefold()) if w not in STOP}


def retrieve_knowledge(db, case, limit=8):
    """Retrieve only currently approved knowledge; keep source status distinct.

    Query uses the caller's existing SQLite connection. This function does not
    call the LLM or trust user-provided source URLs as verified documents.
    """
    if not db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='knowledge_entries'").fetchone():
        return []
    query_terms = terms(case.get('title', '') + ' ' + case.get('summary', ''))
    domain = (case.get('domain') or '').strip().casefold()
    # Bound the candidate pool for predictable investigation latency.
    rows = db.execute("""SELECT k.id,k.title,k.summary,k.domain,k.jurisdiction,
        k.contributor,k.contributor_role,k.source_url,k.source_document_id,
        k.version,k.moderated_at,k.updated_at,
        sp.verification_status,sp.source_type,sp.authority,sp.official_url,
        sp.jurisdiction AS verified_jurisdiction
        FROM knowledge_entries k
        LEFT JOIN source_provenance sp ON sp.document_id=k.source_document_id
        WHERE k.status='approved'
        ORDER BY k.updated_at DESC,k.id LIMIT 500""").fetchall()
    ranked = []
    for row in rows:
        item = dict(row)
        overlap = len(query_terms & terms(item['title'] + ' ' + item['summary']))
        domain_match = bool(domain and domain == (item['domain'] or '').casefold())
        if not overlap and not domain_match:
            continue
        score = overlap * 3 + (5 if domain_match else 0)
        # Source status is an attestation, not independent authentication.
        status = item.pop('verification_status') or 'unregistered'
        verified_type = item.pop('source_type')
        item['source_verification_status'] = status
        item['linked_source_type'] = verified_type
        item['linked_source_reviewer_verified'] = status == 'verified'
        item['knowledge_citation'] = f"knowledge:{item['id']}@v{item['version']}"
        item['usage'] = 'community_context_only_not_policy_evidence'
        ranked.append((score, item['updated_at'], item['id'], item))
    ranked.sort(key=lambda x: (-x[0], x[1], x[2]))
    return [item for _, _, _, item in ranked[:max(0, min(int(limit), 20))]]
