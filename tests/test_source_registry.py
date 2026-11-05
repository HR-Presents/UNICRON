import os
import sqlite3
import tempfile
import unittest
from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from backend.app import source_registry

class SourceRegistryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dbpath = os.path.join(self.tmp.name, 'test.sqlite3')
        con = sqlite3.connect(self.dbpath)
        con.executescript('''CREATE TABLE cases (id TEXT PRIMARY KEY);
            CREATE TABLE evidence_documents (id TEXT PRIMARY KEY, case_id TEXT NOT NULL);
            CREATE TABLE audit (id TEXT PRIMARY KEY,case_id TEXT,action TEXT,detail TEXT,created_at TEXT);
            INSERT INTO cases VALUES ('C1'); INSERT INTO evidence_documents VALUES ('D1','C1');''')
        con.close()
        self.app = FastAPI()
        source_registry.install(self.app, self.dbpath)
        self.client = TestClient(self.app)
        self.env = patch.dict(os.environ, {'CIVITAS_REVIEWER_API_KEY': 'test-secret'})
        self.env.start()
        self.headers = {'X-Reviewer-Key':'test-secret'}
        self.metadata = {'authority':'Example Authority','jurisdiction':'UAE','document_title':'Example Policy',
                         'official_url':'https://example.gov/policy','source_type':'policy'}
        self.base = '/api/cases/C1/evidence/D1'

    def tearDown(self):
        self.env.stop()
        self.tmp.cleanup()

    def test_authentication_required(self):
        self.assertEqual(self.client.put(self.base+'/provenance',json=self.metadata).status_code,401)

    def test_registration_never_verifies(self):
        r=self.client.put(self.base+'/provenance',json=self.metadata,headers=self.headers)
        self.assertEqual(r.status_code,200)
        self.assertFalse(r.json()['is_verified'])
        self.assertEqual(self.client.get('/api/cases/C1/sources').json()[0]['verification_status'],'unverified')

    def test_verification_requires_checks_and_is_immutable(self):
        self.client.put(self.base+'/provenance',json=self.metadata,headers=self.headers)
        decision={'decision':'verified','reviewer':'Test Reviewer','rationale':'Checked source against the authority website.',
                  'checked_url':True,'checked_authority':False,'checked_document':True}
        self.assertEqual(self.client.post(self.base+'/verify',json=decision,headers=self.headers).status_code,422)
        decision['checked_authority']=True
        r=self.client.post(self.base+'/verify',json=decision,headers=self.headers)
        self.assertEqual(r.status_code,201)
        self.assertTrue(r.json()['is_verified'])
        self.assertEqual(self.client.post(self.base+'/verify',json=decision,headers=self.headers).status_code,409)

    def test_reject_non_https(self):
        self.metadata['official_url']='http://example.gov/policy'
        self.assertEqual(self.client.put(self.base+'/provenance',json=self.metadata,headers=self.headers).status_code,422)

if __name__ == '__main__':
    unittest.main()
