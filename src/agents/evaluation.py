"""Automatic evaluation suite for deterministic escape-room agents."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterable

from src.agents.hint_agent import HintAgent
from src.agents.narrator_agent import NarratorAgent
from src.agents.puzzle_agent import PuzzleAgent, build_default_puzzle_agent


@dataclass(frozen=True)
class AgentEvaluationCase:
    """A single input/expectation pair used to score an agent."""

    agent_name: str
    case_id: str
    input_data: dict
    expected: str


@dataclass(frozen=True)
class AgentEvaluationResult:
    """Result for one evaluated input."""

    agent_name: str
    case_id: str
    input_data: dict
    expected: str
    actual: str
    passed: bool


@dataclass(frozen=True)
class AgentEvaluationSummary:
    """Aggregated automatic evaluation results."""

    total: int
    passed: int
    failed: int
    results: tuple[AgentEvaluationResult, ...]

    @property
    def pass_rate(self) -> float:
        if self.total == 0:
            return 0.0
        return self.passed / self.total

    def by_agent(self) -> dict[str, dict[str, int]]:
        grouped: dict[str, dict[str, int]] = {}
        for result in self.results:
            stats = grouped.setdefault(result.agent_name, {"total": 0, "passed": 0, "failed": 0})
            stats["total"] += 1
            if result.passed:
                stats["passed"] += 1
            else:
                stats["failed"] += 1
        return grouped

    def failed_inputs(self) -> tuple[AgentEvaluationResult, ...]:
        return tuple(result for result in self.results if not result.passed)


PuzzleCaseRunner = Callable[[PuzzleAgent, AgentEvaluationCase], AgentEvaluationResult]
HintCaseRunner = Callable[[HintAgent, AgentEvaluationCase], AgentEvaluationResult]
NarratorCaseRunner = Callable[[NarratorAgent, AgentEvaluationCase], AgentEvaluationResult]


def evaluate_agents(
    puzzle_agent: PuzzleAgent | None = None,
    hint_agent: HintAgent | None = None,
    narrator_agent: NarratorAgent | None = None,
) -> AgentEvaluationSummary:
    """Run the default automatic evaluation suite for all backend agents."""

    puzzle = puzzle_agent or build_default_puzzle_agent()
    hint = hint_agent or HintAgent(cooldown_seconds=0)
    narrator = narrator_agent or NarratorAgent()

    results = (
        *_evaluate_cases(puzzle, DEFAULT_PUZZLE_CASES, _evaluate_puzzle_case),
        *_evaluate_cases(hint, DEFAULT_HINT_CASES, _evaluate_hint_case),
        *_evaluate_cases(narrator, DEFAULT_NARRATOR_CASES, _evaluate_narrator_case),
    )
    passed = sum(1 for result in results if result.passed)
    failed = len(results) - passed
    return AgentEvaluationSummary(
        total=len(results),
        passed=passed,
        failed=failed,
        results=results,
    )


def _evaluate_cases(agent, cases: Iterable[AgentEvaluationCase], runner):
    return tuple(runner(agent, case) for case in cases)


def _evaluate_puzzle_case(agent: PuzzleAgent, case: AgentEvaluationCase) -> AgentEvaluationResult:
    result = agent.validate_solution(case.input_data["puzzle_id"], case.input_data["answer"])
    expected_correct = case.input_data["expected_correct"]
    passed = result.correct is expected_correct
    return AgentEvaluationResult(
        agent_name=case.agent_name,
        case_id=case.case_id,
        input_data=case.input_data,
        expected=case.expected,
        actual=f"correct={result.correct}",
        passed=passed,
    )


def _evaluate_hint_case(agent: HintAgent, case: AgentEvaluationCase) -> AgentEvaluationResult:
    result = agent.request_hint(
        puzzle_id=case.input_data["puzzle_id"],
        player_id=case.case_id,
        progress=case.input_data.get("progress"),
        solution=case.input_data.get("solution"),
    )
    text = result.hint.lower()
    required_keywords = tuple(case.input_data.get("required_keywords", ()))
    forbidden_terms = tuple(case.input_data.get("forbidden_terms", ()))
    passed = all(keyword.lower() in text for keyword in required_keywords) and not any(
        term.lower() in text for term in forbidden_terms
    )
    return AgentEvaluationResult(
        agent_name=case.agent_name,
        case_id=case.case_id,
        input_data=case.input_data,
        expected=case.expected,
        actual=result.hint,
        passed=passed,
    )


def _evaluate_narrator_case(agent: NarratorAgent, case: AgentEvaluationCase) -> AgentEvaluationResult:
    result = agent.describe(case.input_data["target_id"], case.input_data.get("state"))
    text = result.description.lower()
    required_keywords = tuple(case.input_data.get("required_keywords", ()))
    passed = all(keyword.lower() in text for keyword in required_keywords)
    return AgentEvaluationResult(
        agent_name=case.agent_name,
        case_id=case.case_id,
        input_data=case.input_data,
        expected=case.expected,
        actual=result.description,
        passed=passed,
    )


DEFAULT_PUZZLE_CASES = (
    AgentEvaluationCase(
        agent_name="puzzle",
        case_id="puzzle-correct-alias",
        input_data={"puzzle_id": "level2_gold", "answer": "Gold", "expected_correct": True},
        expected="Accepts valid aliases and normalises case.",
    ),
    AgentEvaluationCase(
        agent_name="puzzle",
        case_id="puzzle-wrong-answer",
        input_data={"puzzle_id": "level1_lock", "answer": "0000", "expected_correct": False},
        expected="Rejects an incorrect lock code.",
    ),
)

DEFAULT_HINT_CASES = (
    AgentEvaluationCase(
        agent_name="hint",
        case_id="hint-context-keyword",
        input_data={
            "puzzle_id": "level1_lock",
            "required_keywords": ("board",),
            "forbidden_terms": ("7391",),
            "solution": "7391",
        },
        expected="Gives a relevant hint without exposing the solution.",
    ),
    AgentEvaluationCase(
        agent_name="hint",
        case_id="hint-solution-redaction",
        input_data={
            "puzzle_id": "default",
            "required_keywords": ("object",),
            "forbidden_terms": ("smallest answer",),
            "solution": "smallest answer",
        },
        expected="Does not leak an exact solution in the hint text.",
    ),
)

DEFAULT_NARRATOR_CASES = (
    AgentEvaluationCase(
        agent_name="narrator",
        case_id="narrator-known-room",
        input_data={"target_id": "library", "required_keywords": ("library",)},
        expected="Describes a known room with target-specific language.",
    ),
    AgentEvaluationCase(
        agent_name="narrator",
        case_id="narrator-solved-state",
        input_data={
            "target_id": "final_chamber",
            "state": {"solved": True},
            "required_keywords": ("already been disturbed",),
        },
        expected="Reflects solved game state in the narration.",
    ),
)


def format_evaluation_report(summary: AgentEvaluationSummary) -> str:
    """Return a compact human-readable report for CLI or CI output."""

    lines = [
        "Agent automatic evaluation",
        f"Total: {summary.total}",
        f"Passed: {summary.passed}",
        f"Failed: {summary.failed}",
        f"Pass rate: {summary.pass_rate:.0%}",
        "",
        "By agent:",
    ]
    for agent_name, stats in sorted(summary.by_agent().items()):
        lines.append(
            f"- {agent_name}: {stats['passed']}/{stats['total']} passed, {stats['failed']} failed"
        )

    if summary.failed:
        lines.append("")
        lines.append("Failed inputs:")
        for result in summary.failed_inputs():
            lines.append(
                f"- {result.agent_name}/{result.case_id}: input={result.input_data}, actual={result.actual}"
            )

    return "\n".join(lines)


if __name__ == "__main__":
    evaluation_summary = evaluate_agents()
    print(format_evaluation_report(evaluation_summary))
    raise SystemExit(0 if evaluation_summary.failed == 0 else 1)
