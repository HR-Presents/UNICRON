"""Regression coverage for conservative scenario legal-risk annotations."""
import unittest
from backend.app.investigation import assess_scenario_guardrails


class ScenarioGuardrailTests(unittest.TestCase):
    def sample(self, mitigations=None, assumptions=None):
        return {
            "scenario": "Fictional UAE citizen-service assistant",
            "risks": ["Incorrect eligibility guidance"],
            "mitigations": mitigations or [],
            "assumptions": assumptions or [],
        }

    def test_eu_ai_act_implementation_is_flagged(self):
        out = assess_scenario_guardrails(self.sample(
            ["Implementing the AI Act to address risks"]))
        self.assertEqual(out["guardrail_flags"][0]["code"],
                         "jurisdictional_applicability_unestablished")

    def test_gdpr_compliance_is_flagged(self):
        out = assess_scenario_guardrails(self.sample(
            ["Comply with GDPR for this fictional UAE service"]))
        self.assertEqual(len(out["guardrail_flags"]), 1)

    def test_eu_ai_act_benchmark_not_automatically_treated_as_law(self):
        out = assess_scenario_guardrails(self.sample(
            ["Compare the EU AI Act as a possible international benchmark"]))
        self.assertEqual(out["guardrail_flags"], [])
        self.assertEqual(out["legal_applicability"], "not_established")

    def test_unrelated_mitigation_not_flagged_as_legal_claim(self):
        out = assess_scenario_guardrails(self.sample(
            ["Introduce a manual appeal route"]))
        self.assertEqual(out["guardrail_flags"], [])

    def test_assumptions_always_unverified(self):
        out = assess_scenario_guardrails(self.sample(
            assumptions=["All residents can access the service"]))
        self.assertEqual(out["guardrail_flags"][0]["code"],
                         "scenario_assumption_unverified")
        self.assertFalse(out["assumptions_verified"])

    def test_multiple_assumptions_indexed(self):
        out = assess_scenario_guardrails(self.sample(
            assumptions=["Assumption A", "Assumption B"]))
        self.assertEqual([x["index"] for x in out["guardrail_flags"]], [0, 1])

    def test_original_model_output_preserved(self):
        original = self.sample(["Implementing the AI Act"], ["Assumption A"])
        out = assess_scenario_guardrails(original)
        for key in ("scenario", "risks", "mitigations", "assumptions"):
            self.assertEqual(out[key], original[key])
        self.assertNotIn("guardrail_flags", original)

    def test_no_automatic_approval(self):
        out = assess_scenario_guardrails(self.sample())
        self.assertTrue(out["human_review_required"])
        self.assertFalse(out["automated_approval_permitted"])

    def test_legal_applicability_never_established(self):
        out = assess_scenario_guardrails(self.sample(
            ["Implementing the EU AI Act"]))
        self.assertEqual(out["legal_applicability"], "not_established")

    def test_case_insensitive_flag(self):
        out = assess_scenario_guardrails(self.sample(
            ["IMPLEMENT THE EU AI ACT for the department"]))
        self.assertEqual(len(out["guardrail_flags"]), 1)


if __name__ == "__main__":
    unittest.main()
