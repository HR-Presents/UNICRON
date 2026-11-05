import unittest
from backend.app.grounded_policy import generate_draft, validate_draft

MATRIX = {'jurisdictions': [
    {'jurisdiction': 'UAE', 'evidence': [{'citation': 'a#p1', 'verbatim_excerpt': 'Service notices are required.'}]},
    {'jurisdiction': 'Singapore', 'evidence': [{'citation': 'b#p1', 'verbatim_excerpt': 'Service notices are recommended.'}]},
]}

def raw(citations=None):
    return {'comparisons': [{'observation': 'The provided passages describe service notices differently.',
                             'citations': citations or ['a#p1', 'b#p1'],
                             'classification': 'potential_difference'}],
            'recommendation_drafts': [], 'unresolved_questions': []}

class GroundedPolicyTests(unittest.TestCase):
    def test_valid(self):
        result = validate_draft(raw(), MATRIX)
        self.assertTrue(result['human_review_required'])
        self.assertEqual(result['semantic_entailment'], 'not_verified')
    def test_reject_invented_citation(self):
        with self.assertRaises(ValueError): validate_draft(raw(['a#p1', 'fake#p2']), MATRIX)
    def test_reject_single_jurisdiction(self):
        with self.assertRaises(ValueError): validate_draft(raw(['a#p1', 'a#p1']), MATRIX)
    def test_reject_invalid_classification(self):
        r = raw(); r['comparisons'][0]['classification'] = 'legally_binding'
        with self.assertRaises(ValueError): validate_draft(r, MATRIX)
    def test_no_model_when_insufficient(self):
        self.assertIsNone(generate_draft(None, lambda *a, **k: self.fail('called')))
    def test_model_is_invoked(self):
        result = generate_draft(MATRIX, lambda *a, **k: raw())
        self.assertEqual(result['method'], 'llm_draft_with_citation_allowlist')
