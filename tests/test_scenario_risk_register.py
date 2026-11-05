"""Scenario risk register never fabricates severity or mitigation assurance."""
import unittest
from backend.app.investigation import assess_scenario_risks


class ScenarioRiskRegisterTests(unittest.TestCase):
    def test_each_risk_has_stable_identifier(self):
        records = assess_scenario_risks({
            'risks': ['Service outage', 'Incorrect guidance'],
            'mitigations': ['Human escalation', 'Audit review']})
        self.assertEqual([r['risk_id'] for r in records], ['R1', 'R2'])
        self.assertEqual(records[0]['mitigation'], 'Human escalation')
        self.assertEqual(records[1]['mitigation'], 'Audit review')

    def test_no_invented_numeric_scores(self):
        record = assess_scenario_risks({'risks': ['Bias risk'], 'mitigations': []})[0]
        self.assertEqual(record['severity'], 'unassessed')
        self.assertEqual(record['likelihood'], 'unassessed')
        self.assertEqual(record['risk_level'], 'requires_domain_assessment')
        self.assertEqual(record['mitigation_effectiveness'], 'not_verified')

    def test_missing_mitigation_visible(self):
        records = assess_scenario_risks({
            'risks': ['Risk A', 'Risk B'], 'mitigations': ['Action A']})
        self.assertIsNone(records[1]['mitigation'])
        self.assertEqual(records[1]['mitigation_link_basis'], 'none')

    def test_position_mapping_is_not_verified(self):
        record = assess_scenario_risks({
            'risks': ['Risk'], 'mitigations': ['Proposal']})[0]
        self.assertEqual(record['mitigation_link_basis'], 'list_position_unverified')
        self.assertTrue(record['human_review_required'])
        self.assertFalse(record['assumptions_verified'])

    def test_empty_risks_returns_empty_register(self):
        self.assertEqual(assess_scenario_risks({'risks': [], 'mitigations': []}), [])


if __name__ == '__main__':
    unittest.main()
