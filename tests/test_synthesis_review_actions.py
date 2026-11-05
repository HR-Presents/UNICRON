"""Citation-allowlisted reviewer action planning."""
import unittest
from backend.app.investigation import synthesis_review_actions


class SynthesisReviewActionsTests(unittest.TestCase):
    def test_valid_citation_proposal_remains_unapproved(self):
        benchmark = {'status': 'review_required', 'result': {
            'ai_comparison_draft': {
                'evidence': [{'citation': 'EU:1'}, {'citation': 'UK:2'}],
                'policy_recommendation_drafts': [
                    {'action': 'Review transparency documentation obligations',
                     'citations': ['EU:1', 'UK:2']}]}}}
        actions = synthesis_review_actions(benchmark, {})
        proposal = actions[-1]
        self.assertEqual(proposal['citations'], ['EU:1', 'UK:2'])
        self.assertEqual(proposal['status'], 'proposal_requires_review')
        self.assertEqual(proposal['legal_applicability'], 'not_established')

    def test_unknown_citations_rejected(self):
        benchmark = {'status': 'completed', 'result': {'ai_comparison_draft': {
            'evidence': [{'citation': 'EU:1'}],
            'policy_recommendation_drafts': [
                {'action': 'Unverified proposal', 'citations': ['EU:1', 'UNKNOWN']}]}}}
        self.assertEqual(synthesis_review_actions(benchmark, {}), [])

    def test_duplicate_citations_rejected(self):
        benchmark = {'status': 'completed', 'result': {'ai_comparison_draft': {
            'evidence': [{'citation': 'EU:1'}],
            'policy_recommendation_drafts': [
                {'action': 'Duplicate', 'citations': ['EU:1', 'EU:1']}]}}}
        self.assertEqual(synthesis_review_actions(benchmark, {}), [])

    def test_critical_review_tasks_first(self):
        actions = synthesis_review_actions(
            {'status': 'review_required', 'result': {}},
            {'guardrail_flags': [{'code': 'scenario_assumption_unverified'}]})
        self.assertEqual([a['priority'] for a in actions], ['critical', 'critical'])
        self.assertEqual(actions[0]['owner'], 'qualified_legal_reviewer')
        self.assertEqual(actions[1]['owner'], 'scenario_domain_reviewer')

    def test_missing_draft_no_crash(self):
        self.assertEqual(synthesis_review_actions(
            {'status': 'completed', 'result': {}}, {}), [])


if __name__ == '__main__':
    unittest.main()
