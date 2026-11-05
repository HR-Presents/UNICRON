import sqlite3
import unittest
from backend.app.knowledge_retrieval import retrieve_knowledge


class KnowledgeRetrievalTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.row_factory = sqlite3.Row
        self.db.executescript('''
          CREATE TABLE knowledge_entries (id TEXT, title TEXT, summary TEXT, domain TEXT,
            jurisdiction TEXT, contributor TEXT, contributor_role TEXT, source_url TEXT,
            source_document_id TEXT, version INTEGER, moderated_at TEXT, updated_at TEXT, status TEXT);
          CREATE TABLE source_provenance (document_id TEXT, verification_status TEXT,
            source_type TEXT, authority TEXT, official_url TEXT, jurisdiction TEXT);
        ''')

    def tearDown(self):
        self.db.close()

    def add(self, id, status, jurisdiction='Canada', version=1, document=None):
        self.db.execute('''INSERT INTO knowledge_entries VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)''',
            (id, 'Water infrastructure continuity', 'Water infrastructure continuity guidelines for emergency planning',
             'Citizen services', jurisdiction, 'Test Contributor', 'researcher', None, document,
             version, '2026-01-01', '2026-01-01', status))

    def test_approved_cross_jurisdiction_only(self):
        self.add('approved', 'approved')
        self.add('pending', 'pending')
        self.add('rejected', 'rejected')
        results = retrieve_knowledge(self.db, {'title':'Water infrastructure', 'summary':'continuity', 'domain':'Citizen services'})
        self.assertEqual([r['id'] for r in results], ['approved'])
        self.assertEqual(results[0]['jurisdiction'], 'Canada')
        self.assertEqual(results[0]['knowledge_citation'], 'knowledge:approved@v1')
        self.assertEqual(results[0]['usage'], 'community_context_only_not_policy_evidence')

    def test_current_revision_only_and_unverified_not_promoted(self):
        self.add('revised', 'approved', version=3, document='doc')
        self.db.execute("INSERT INTO source_provenance VALUES ('doc','rejected','policy','Example Authority','https://example.org','Canada')")
        result = retrieve_knowledge(self.db, {'title':'Water infrastructure', 'domain':'Citizen services'})[0]
        self.assertEqual(result['knowledge_citation'], 'knowledge:revised@v3')
        self.assertFalse(result['linked_source_reviewer_verified'])
        self.assertEqual(result['source_verification_status'], 'rejected')

    def test_no_match_and_missing_table(self):
        self.add('a', 'approved')
        self.assertEqual(retrieve_knowledge(self.db, {'title':'Unrelated aerospace', 'domain':'Healthcare'}), [])
        other = sqlite3.connect(':memory:')
        self.assertEqual(retrieve_knowledge(other, {'title':'Water'}), [])
        other.close()

    def test_bounded_results(self):
        for i in range(30):
            self.add(str(i), 'approved')
        result = retrieve_knowledge(self.db, {'title':'Water infrastructure', 'domain':'Citizen services'}, limit=1000)
        self.assertEqual(len(result), 20)

if __name__ == '__main__':
    unittest.main()
