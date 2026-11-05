import os
import sqlite3
import tempfile
import unittest
from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from backend.app import knowledge_base as kb


class KnowledgeBaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        path = self.tmp.name + '/test.sqlite3'
        with sqlite3.connect(path) as con:
            con.execute('CREATE TABLE evidence_documents (id TEXT PRIMARY KEY)')
            con.execute('CREATE TABLE source_provenance (document_id TEXT PRIMARY KEY, verification_status TEXT)')
            con.execute("INSERT INTO evidence_documents VALUES ('doc1')")
            con.execute("INSERT INTO source_provenance VALUES ('doc1','unverified')")
        app = FastAPI()
        kb.install(app, path)
        self.client = TestClient(app)
        self.env = patch.dict(os.environ, {'CIVITAS_REVIEWER_API_KEY':'test-only-secret'})
        self.env.start()
        self.auth = {'X-Reviewer-Key':'test-only-secret'}

    def tearDown(self):
        self.env.stop()
        self.tmp.cleanup()

    def submit(self, **changes):
        payload = dict(title='Synthetic service policy comparison',summary='Synthetic example text for integration testing only.',
                       domain='Citizen services',jurisdiction='Canada',contributor='Example Researcher',
                       contributor_role='researcher',source_document_id='doc1')
        payload.update(changes)
        response = self.client.post('/api/knowledge/contributions',json=payload)
        self.assertEqual(response.status_code,201,response.text)
        return response.json()

    def test_pending_hidden_until_moderated(self):
        item=self.submit()
        self.assertEqual(item['status'],'pending')
        self.assertFalse(item['is_authenticated_source'])
        self.assertEqual(self.client.get('/api/knowledge').json(),[])
        self.assertEqual(self.client.get('/api/knowledge/'+item['id']).status_code,404)
        self.assertEqual(self.client.get('/api/knowledge/moderation/queue').status_code,401)
        self.assertEqual(len(self.client.get('/api/knowledge/moderation/queue',headers=self.auth).json()),1)
        result=self.client.post('/api/knowledge/'+item['id']+'/moderate',headers=self.auth,
            json={'decision':'approved','reviewer':'Test Reviewer','rationale':'Reviewed synthetic entry for test'} )
        self.assertEqual(result.status_code,201,result.text)
        self.assertEqual(result.json()['source_verification_status'],'unverified')
        self.assertEqual(len(self.client.get('/api/knowledge',params={'jurisdiction':'Canada'}).json()),1)
        self.assertEqual(self.client.post('/api/knowledge/'+item['id']+'/moderate',headers=self.auth,
            json={'decision':'rejected','reviewer':'Test Reviewer','rationale':'Second decision must be blocked'}).status_code,409)

    def test_revisions_require_new_approval_and_preserve_history(self):
        item=self.submit()
        path='/api/knowledge/'+item['id']
        self.client.post(path+'/moderate',headers=self.auth,json={'decision':'approved','reviewer':'Test Reviewer','rationale':'Approved initial synthetic record'})
        revised=self.client.post(path+'/revisions',headers=self.auth,json={
            'title':'Revised synthetic policy record','summary':'Updated synthetic content for testing revisions.',
            'editor':'Test Editor','rationale':'Improve wording'} )
        self.assertEqual(revised.status_code,201,revised.text)
        self.assertEqual(revised.json()['version'],2)
        self.assertEqual(self.client.get(path).status_code,404)
        self.assertEqual(len(self.client.get(path+'/history',headers=self.auth).json()),2)

    def test_rejected_entry_not_public_and_url_validation(self):
        bad=self.client.post('/api/knowledge/contributions',json={
            'title':'Synthetic source for testing','summary':'Synthetic description used for a test only.',
            'domain':'Health','jurisdiction':'UAE','contributor':'Test User',
            'contributor_role':'student','source_url':'http://example.com'})
        self.assertEqual(bad.status_code,422)
        item=self.submit(source_document_id=None)
        res=self.client.post('/api/knowledge/'+item['id']+'/moderate',headers=self.auth,json={
            'decision':'rejected','reviewer':'Test Reviewer','rationale':'Insufficient support for publication'})
        self.assertEqual(res.status_code,201)
        self.assertEqual(self.client.get('/api/knowledge').json(),[])


if __name__ == '__main__':
    unittest.main()
