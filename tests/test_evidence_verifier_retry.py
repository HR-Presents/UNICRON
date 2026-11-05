"""Evidence verifier retries fail closed and retain exact citation provenance."""
import unittest
from backend.app.grounded_policy import verify_draft_claims


def draft():
    return {
        'comparisons': [{'observation': 'Transparency is discussed',
                         'citations': ['eu#p1', 'uk#p1']}],
        'evidence': [
            {'citation': 'eu#p1', 'jurisdiction': 'EU',
             'verbatim_excerpt': 'Transparency and accountability ' * 30},
            {'citation': 'uk#p1', 'jurisdiction': 'UK',
             'verbatim_excerpt': 'Transparency for public services ' * 30},
        ],
        'claim_risk_flags': [], 'limitations': '',
        'approved_policy_findings': [], 'automated_approval_permitted': False,
        'human_review_required': True,
    }


class EvidenceVerifierRetryTests(unittest.TestCase):
    def test_retry_after_invalid_first_response(self):
        calls = []
        def model(system, context, schema, max_tokens):
            calls.append((context, max_tokens))
            if len(calls) == 1:
                return {'assessments': []}
            return {'assessments': [{'claim_index': 0,
                                    'verdict': 'insufficient_evidence',
                                    'reason': 'Cited excerpts do not establish this'}]}
        result = verify_draft_claims(draft(), model)
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[0][1], 480)
        self.assertEqual(calls[1][1], 640)
        self.assertLessEqual(len(calls[1][0]['claims'][0]['cited_excerpts'][0]['text']), 220)
        self.assertEqual(result['semantic_entailment'], 'model_assessed_not_verified')
        self.assertEqual(result['model_evidence_assessments'][0]['verdict'],
                         'insufficient_evidence')

    def test_retry_after_transport_failure(self):
        calls = []
        def model(*args, **kwargs):
            calls.append(1)
            if len(calls) == 1:
                raise TimeoutError('secret evidence')
            return {'assessments': [{'claim_index': 0,
                                    'verdict': 'supported',
                                    'reason': 'Both passages mention transparency'}]}
        result = verify_draft_claims(draft(), model)
        self.assertEqual(len(calls), 2)
        self.assertEqual(result['semantic_entailment'], 'model_assessed_not_verified')
        self.assertFalse(result['automated_approval_permitted'])

    def test_both_fail_closed_without_leaking_exception(self):
        def model(*args, **kwargs):
            raise ValueError('private content from model')
        result = verify_draft_claims(draft(), model)
        self.assertEqual(result['semantic_entailment'], 'verification_unavailable')
        self.assertEqual(result['model_evidence_assessments'], [])
        self.assertEqual(result['claim_risk_flags'][-1]['code'],
                         'semantic_verifier_unavailable')
        self.assertNotIn('private content', str(result))

    def test_invalid_verdict_never_accepted(self):
        def model(*args, **kwargs):
            return {'assessments': [{'claim_index': 0, 'verdict': 'approved',
                                    'reason': 'This is not an allowed verdict'}]}
        result = verify_draft_claims(draft(), model)
        self.assertEqual(result['semantic_entailment'], 'verification_unavailable')

    def test_duplicate_index_never_accepted(self):
        def model(*args, **kwargs):
            return {'assessments': [
                {'claim_index': 0, 'verdict': 'supported', 'reason': 'First reason'},
                {'claim_index': 0, 'verdict': 'supported', 'reason': 'Second reason'},
            ]}
        result = verify_draft_claims(draft(), model)
        self.assertEqual(result['semantic_entailment'], 'verification_unavailable')

    def test_success_does_not_retry(self):
        calls = []
        def model(*args, **kwargs):
            calls.append(1)
            return {'assessments': [{'claim_index': 0, 'verdict': 'supported',
                                    'reason': 'Direct textual support is present'}]}
        result = verify_draft_claims(draft(), model)
        self.assertEqual(len(calls), 1)
        self.assertTrue(result['human_review_required'])
        self.assertEqual(result['approved_policy_findings'], [])


if __name__ == '__main__':
    unittest.main()
