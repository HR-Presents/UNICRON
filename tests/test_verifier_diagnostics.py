"""Verifier diagnostics expose failure categories without model text."""
import unittest
from backend.app.grounded_policy import verify_draft_claims


def sample():
    return {
        'comparisons': [{'observation': 'Transparency is discussed',
                         'citations': ['eu#p1', 'uk#p1']}],
        'evidence': [
            {'citation': 'eu#p1', 'jurisdiction': 'EU',
             'verbatim_excerpt': 'Transparency and accountability'},
            {'citation': 'uk#p1', 'jurisdiction': 'UK',
             'verbatim_excerpt': 'Transparency for public services'},
        ],
        'claim_risk_flags': [], 'limitations': '',
        'approved_policy_findings': [], 'automated_approval_permitted': False,
        'human_review_required': True,
    }


class VerifierDiagnosticsTests(unittest.TestCase):
    def test_invalid_response_diagnostics(self):
        result = verify_draft_claims(sample(), lambda *args, **kwargs: {'assessments': []})
        self.assertEqual(result['verifier_diagnostics'], {
            'attempt_count': 2,
            'failure_categories': ['invalid_verifier_response', 'invalid_verifier_response'],
            'outcome': 'unavailable',
        })
        self.assertEqual(result['semantic_entailment'], 'verification_unavailable')

    def test_transport_failure_does_not_leak(self):
        def fail(*args, **kwargs):
            raise RuntimeError('private evidence contents')
        result = verify_draft_claims(sample(), fail)
        self.assertEqual(result['verifier_diagnostics']['failure_categories'],
                         ['model_call_failed', 'model_call_failed'])
        self.assertNotIn('private evidence contents', str(result))

    def test_retry_success_reports_one_failure(self):
        calls = []
        def model(*args, **kwargs):
            calls.append(1)
            if len(calls) == 1:
                return {'assessments': []}
            return {'assessments': [{'claim_index': 0, 'verdict': 'insufficient_evidence',
                                    'reason': 'Citations do not prove this claim'}]}
        result = verify_draft_claims(sample(), model)
        self.assertEqual(result['verifier_diagnostics']['attempt_count'], 2)
        self.assertEqual(result['verifier_diagnostics']['failure_categories'],
                         ['invalid_verifier_response'])
        self.assertEqual(result['verifier_diagnostics']['outcome'],
                         'model_assessed_not_verified')

    def test_first_attempt_success(self):
        def model(*args, **kwargs):
            return {'assessments': [{'claim_index': 0, 'verdict': 'supported',
                                    'reason': 'Both excerpts discuss transparency'}]}
        result = verify_draft_claims(sample(), model)
        self.assertEqual(result['verifier_diagnostics']['attempt_count'], 1)
        self.assertEqual(result['verifier_diagnostics']['failure_categories'], [])
        self.assertFalse(result['automated_approval_permitted'])


if __name__ == '__main__':
    unittest.main()
