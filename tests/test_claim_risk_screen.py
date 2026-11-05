import unittest
from backend.app.grounded_policy import validate_draft

MATRIX = {'jurisdictions': [
    {'jurisdiction': 'UAE', 'evidence': [{'citation': 'uae#p1', 'verbatim_excerpt': 'Offices must publish incident updates.'}]},
    {'jurisdiction': 'Singapore', 'evidence': [{'citation': 'sg#p1', 'verbatim_excerpt': 'Agencies should notify residents.'}]},
]}

def payload(observation):
    return {'comparisons': [{'observation': observation, 'citations': ['uae#p1', 'sg#p1'], 'classification': 'requires_review'}],
            'recommendation_drafts': [], 'unresolved_questions': []}

class ClaimRiskTests(unittest.TestCase):
    def test_unproven_difference_is_flagged(self):
        result = validate_draft(payload('The excerpts indicate differing requirements across jurisdictions.'), MATRIX)
        self.assertIn('unproven_legal_difference', [x['code'] for x in result['claim_risk_flags']])
        self.assertEqual(result['approved_policy_findings'], [])
        self.assertFalse(result['automated_approval_permitted'])
    def test_conflict_is_flagged(self):
        result = validate_draft(payload('The laws conflict on service notifications.'), MATRIX)
        self.assertIn('unproven_legal_conflict', [x['code'] for x in result['claim_risk_flags']])
    def test_neutral_claim_not_certified(self):
        result = validate_draft(payload('Both excerpts mention notification practices.'), MATRIX)
        self.assertEqual(result['claim_grounding_status'], 'not_semantically_verified')
        self.assertEqual(result['semantic_entailment'], 'not_verified')
        self.assertFalse(result['automated_approval_permitted'])
    def test_reject_fabricated_citation_still(self):
        r = payload('Both excerpts mention notifications.')
        r['comparisons'][0]['citations'] = ['uae#p1', 'fake#p1']
        with self.assertRaises(ValueError): validate_draft(r, MATRIX)
