"""Deterministic synthesis gates do not rely on generated model prose."""
import unittest
from backend.app.investigation import synthesis_review_gates


class SynthesisReviewGateTests(unittest.TestCase):
    def test_review_required_stages_create_gates(self):
        gates = synthesis_review_gates(
            {'status': 'review_required'}, {'status': 'review_required', 'result': {}},
            {'guardrail_flags': []})
        self.assertEqual([g['agent'] for g in gates[:2]],
                         ['Policy Advisor', 'Global Benchmark Agent'])

    def test_missing_semantic_assessment_flagged(self):
        gates = synthesis_review_gates(
            {'status': 'completed'},
            {'status': 'completed', 'result': {'ai_comparison_draft': {
                'semantic_entailment': 'verification_unavailable'}}},
            {'guardrail_flags': []})
        self.assertEqual(gates[0]['code'], 'semantic_assessment_unavailable')

    def test_model_assessment_not_treated_as_legal_approval(self):
        gates = synthesis_review_gates(
            {'status': 'review_required'},
            {'status': 'review_required', 'result': {'ai_comparison_draft': {
                'semantic_entailment': 'model_assessed_not_verified'}}},
            {'guardrail_flags': []})
        self.assertEqual(len(gates), 2)

    def test_scenario_flags_create_gate(self):
        gates = synthesis_review_gates(
            {'status': 'completed'},
            {'status': 'completed', 'result': {}},
            {'guardrail_flags': [{'code': 'scenario_assumption_unverified'}]})
        self.assertEqual(gates[-1]['code'],
                         'scenario_assumptions_or_applicability_unverified')

    def test_empty_stages_do_not_crash(self):
        gates = synthesis_review_gates({}, {}, {})
        self.assertTrue(gates)


if __name__ == '__main__':
    unittest.main()
