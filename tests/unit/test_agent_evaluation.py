import unittest

from src.agents.evaluation import (
    AgentEvaluationCase,
    evaluate_agents,
    format_evaluation_report,
)
from src.agents.puzzle_agent import PuzzleAgent, PuzzleDefinition


class AgentEvaluationTest(unittest.TestCase):
    def test_default_evaluation_counts_good_and_bad_inputs(self):
        summary = evaluate_agents()

        self.assertEqual(summary.total, 6)
        self.assertEqual(summary.passed, 6)
        self.assertEqual(summary.failed, 0)
        self.assertEqual(summary.by_agent()["puzzle"], {"total": 2, "passed": 2, "failed": 0})
        self.assertEqual(summary.by_agent()["hint"], {"total": 2, "passed": 2, "failed": 0})
        self.assertEqual(summary.by_agent()["narrator"], {"total": 2, "passed": 2, "failed": 0})

    def test_evaluation_reports_failed_agent_inputs(self):
        agent = PuzzleAgent([
            PuzzleDefinition("lock", "1234"),
            PuzzleDefinition("level1_lock", "7391"),
            PuzzleDefinition("level2_gold", "au", aliases=("gold",)),
            PuzzleDefinition("level4_open", "open"),
        ])
        broken_case = AgentEvaluationCase(
            agent_name="puzzle",
            case_id="expected-to-fail",
            input_data={"puzzle_id": "lock", "answer": "wrong", "expected_correct": True},
            expected="This intentionally expects a wrong answer to be accepted.",
        )

        from src.agents import evaluation

        original_cases = evaluation.DEFAULT_PUZZLE_CASES
        try:
            evaluation.DEFAULT_PUZZLE_CASES = (broken_case,)
            summary = evaluate_agents(puzzle_agent=agent)
        finally:
            evaluation.DEFAULT_PUZZLE_CASES = original_cases

        failed_inputs = summary.failed_inputs()
        self.assertEqual(len(failed_inputs), 1)
        self.assertEqual(failed_inputs[0].case_id, "expected-to-fail")
        self.assertEqual(summary.by_agent()["puzzle"], {"total": 1, "passed": 0, "failed": 1})

    def test_formats_report_with_passed_and_failed_counts(self):
        summary = evaluate_agents()

        report = format_evaluation_report(summary)

        self.assertIn("Passed: 6", report)
        self.assertIn("Failed: 0", report)
        self.assertIn("- puzzle: 2/2 passed, 0 failed", report)


if __name__ == "__main__":
    unittest.main()
