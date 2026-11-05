import unittest
from backend.app.grounded_policy import validate_draft, verify_draft_claims

MATRIX = {'jurisdictions': [
    {'jurisdiction': 'UAE', 'evidence': [{'citation': 'uae#p1', 'verbatim_excerpt': 'Agencies publish notices.'}]},
    {'jurisdiction': 'Singapore', 'evidence': [{'citation': 'sg#p1', 'verbatim_excerpt': 'Offices publish updates.'}]},
]}
RAW = {'comparisons': [
    {'observation': 'Both jurisdictions describe publication practices.',
     'citations': ['uae#p1', 'sg#p1'], 'classification': 'requires_review'}],
    'recommendation_drafts': [], 'unresolved_questions': []}


class IndependentEvidenceAssessmentTests(unittest.TestCase):
    def draft(self):
        return validate_draft(RAW, MATRIX)

    def test_supported_is_not_legal_certification(self):
        def model(*args, **kwargs):
            return {'assessments': [{'claim_index': 0, 'verdict': 'supported',
                                    'reason': 'Both passages mention publication.'}]}
        result = verify_draft_claims(self.draft(), model)
        self.assertEqual(result['semantic_entailment'], 'model_assessed_not_verified')
        self.assertTrue(result['human_review_required'])
        self.assertFalse(result['automated_approval_permitted'])
        self.assertEqual(result['approved_policy_findings'], [])

    def test_contradiction_is_flagged(self):
        result = verify_draft_claims(self.draft(), lambda *a, **kw: {
            'assessments': [{'claim_index': 0, 'verdict': 'contradicted',
                             'reason': 'The passages do not establish this.'}]})
        self.assertIn('model_evidence_contradicted',
                      [risk['code'] for risk in result['claim_risk_flags']])

    def test_missing_verdict_fails_closed(self):
        result = verify_draft_claims(self.draft(), lambda *a, **kw: {'assessments': []})
        self.assertEqual(result['semantic_entailment'], 'verification_unavailable')
        self.assertIn('semantic_verifier_unavailable',
                      [risk['code'] for risk in result['claim_risk_flags']])

    def test_model_failure_fails_closed(self):
        def unavailable(*args, **kwargs):
            raise TimeoutError('Model offline')
        result = verify_draft_claims(self.draft(), unavailable)
        self.assertEqual(result['semantic_entailment'], 'verification_unavailable')
        self.assertFalse(result['automated_approval_permitted'])

    def test_no_claims_skips_model(self):
        raw = dict(RAW, comparisons=[])
        draft = validate_draft(raw, MATRIX)
        result = verify_draft_claims(draft, lambda *a, **kw: self.fail('should not call model'))
        self.assertEqual(result['semantic_entailment'], 'no_claims_to_assess')
