import unittest
from backend.app.policy_intelligence import benchmark_stage

CASE = {'title': 'Service interruption', 'summary': 'Residents require notices during interruption.'}

def p(jurisdiction, citation, text, status='verified', kind='benchmark'):
    return {'jurisdiction':jurisdiction, 'citation':citation, 'text':text,
            'source_type':kind, 'verification_status':status,
            'official_url':'https://example.gov/policy', 'filename':'fixture.txt',
            'document_id':citation.split('#')[0], 'authority':'Test Authority',
            'document_title':'Test fixture', 'source_note':''}

class Phase8D2Tests(unittest.TestCase):
    def test_two_jurisdictions_produce_cited_review_candidates(self):
        result=benchmark_stage([
            p('UAE','a#p1','Residents receive notice when services are interrupted.'),
            p('Singapore','b#p1','Residents receive notice during a service interruption.')],CASE)
        draft=result['result']['comparison_draft']
        self.assertEqual(result['status'],'review_required')
        self.assertIsNone(result['result']['comparison'])
        self.assertTrue(draft['human_review_required'])
        self.assertTrue(draft['candidates'])
        self.assertEqual(set(draft['candidates'][0]['citations']), {'a#p1','b#p1'})
        self.assertEqual(draft['policy_recommendation_drafts'],[])
        self.assertEqual(draft['candidates'][0]['conflict'],'undetermined')

    def test_no_unverified_jurisdiction_promotion(self):
        result=benchmark_stage([
            p('UAE','a#p1','Residents receive notice when services are interrupted.'),
            p('Singapore','b#p1','Residents receive notice when services are interrupted.',status='rejected')],CASE)
        self.assertEqual(result['status'],'source_required')
        self.assertIsNone(result['result']['comparison_draft'])

    def test_no_fabricated_similarity_when_topics_do_not_overlap(self):
        result=benchmark_stage([
            p('UAE','a#p1','Residents receive notices for interrupted electricity distribution.'),
            p('Singapore','b#p1','Hospitals archive clinical laboratory samples for audits.')],CASE)
        self.assertEqual(result['result']['comparison_draft']['candidates'],[])

    def test_single_jurisdiction_does_not_generate_draft(self):
        result=benchmark_stage([p('UAE','a#p1','Residents receive notice for interruptions.')],CASE)
        self.assertIsNone(result['result']['comparison_draft'])

if __name__=='__main__': unittest.main()
