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

    def test_realistic_long_reason_is_accepted(self):
        reason = (
            'The excerpts from the EU and UK both discuss transparency in '
            'public-sector AI systems, with the EU emphasizing appropriate '
            'transparency for user understanding and the UK highlighting the '
            'need for publication of information about algorithmic tools '
            'to support transparency.'
        )
        self.assertGreater(len(reason), 250)
        def model(*args, **kwargs):
            return {'assessments': [{'claim_index': 0, 'verdict': 'supported',
                                    'reason': reason}]}
        result = verify_draft_claims(sample(), model)
        self.assertEqual(result['verifier_diagnostics']['attempt_count'], 1)
        self.assertEqual(result['semantic_entailment'], 'model_assessed_not_verified')
        self.assertEqual(result['model_evidence_assessments'][0]['reason'], reason)
        self.assertTrue(result['human_review_required'])
        self.assertFalse(result['automated_approval_permitted'])

    def test_excessively_long_reason_still_fails_closed(self):
        def model(*args, **kwargs):
            return {'assessments': [{'claim_index': 0, 'verdict': 'supported',
                                    'reason': 'x' * 501}]}
        result = verify_draft_claims(sample(), model)
        self.assertEqual(result['semantic_entailment'], 'verification_unavailable')
        self.assertEqual(result['verifier_diagnostics']['attempt_count'], 2)
        self.assertEqual(result['model_evidence_assessments'], [])
        self.assertFalse(result['automated_approval_permitted'])

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
