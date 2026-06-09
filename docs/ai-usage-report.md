
# AI Usage Report

## Scope

This document records how AI assistance was used during the development of the
AI Escape Room project. It focuses on requirements analysis, implementation
support, debugging, documentation, testing, CI/CD and quality checks. Human
developers remained responsible for reviewing, adapting and accepting all
generated changes.

The project used AI in two distinct ways:

1. as a development assistant for planning, coding and validation;
2. as a core runtime feature inside the application through the in-game AI
   agents.

## Tools Used

| Tool | Usage |
|---|---|
| ChatGPT | Requirements brainstorming, user-story polishing, debugging help, README drafting, review of edge cases |
| Claude | Architecture structuring, diagram explanations, backlog refinement, documentation writing, narrative style support |
| Codex | Code generation, code review support, refactoring, test generation, bug fixing and repository-wide implementation tasks |
| Antigravity | Mermaid diagram creation and workflow visualization for architecture, multiplayer flow and CI/CD planning |
| Groq API | Runtime AI hint generation through the Next.js `/api/hint` route |
| Gemini API | Runtime answer validation fallback path through `/api/validate-answer` |
| Deterministic fallback logic | Local non-LLM behavior for hints, narration and validation when API keys are missing or requests timeout |

The team used these tools iteratively, not just once at the beginning. Planning
was refined with ChatGPT and Claude, implementation was accelerated with Codex,
and visual documentation was prepared with Antigravity and Mermaid. When the AI
produced incorrect or incomplete code, the output was manually corrected and
then validated with tests.

## Development Contributions

### Requirements, Backlog and Planning

AI was used to turn the project idea into a structured backlog with clear user
stories and acceptance criteria. The team used ChatGPT and Claude to:

- break the escape-room concept into playable epics and sprint-sized tasks;
- define user stories for exploration, puzzles, inventory, AI interaction and
  multiplayer synchronization;
- refine acceptance criteria for room code sharing, team roles, shared
  inventory, timers and leaderboard behaviour;
- reorganize the backlog so the work could be tracked in a way suitable for
  presentation and grading.

This work is reflected in the backlog files in `docs/backlog.pdf`,
`docs/backlog-status.md` and `docs/multiplayer-backlog.md`.

### Architecture and Diagrams

Claude and Antigravity were used to help design and explain the structure of
the system. Mermaid diagrams were used where text-first diagramming was the
fastest way to iterate, and the output was later exported into the diagrams
folder.

AI-assisted diagrams covered:

- the overall component architecture;
- the database / persistence model;
- agent interaction flow;
- game state progression and win conditions;
- CI/CD workflow and validation gates;
- multiplayer synchronization flow and role-based interaction.

The final diagrams are stored in `docs/diagrams/`.

### Backend Agents

AI assistance was used to scaffold and refine the Python backend layer:

- `PuzzleAgent` for answer validation, aliases, fuzzy matching and attempt logs.
- `HintAgent` for progressive hints, cooldown handling and solution leak protection.
- `NarratorAgent` for Victorian mystery style descriptions.
- `PuzzleEngine`, `Inventory`, `Room` and `EscapeRoomGame` for backend game state coordination.
- FastAPI routes for health checks, state snapshots, answer validation, hints and narration.

Codex was especially useful here because the codebase contains a mix of game
logic, persistence logic and AI-facing routes. It helped draft new modules,
refactor existing functions into smaller units and keep the code style aligned
with the rest of the repo.

The generated code was reviewed and verified locally with Python compilation,
unit tests and repeated manual gameplay checks.

### Frontend AI Routes

AI assistance was used to improve the Next.js serverless AI endpoints:

- `/api/hint` now supports progressive hint levels, per-player cooldown and local fallback behavior.
- `/api/validate-answer` now has deterministic validation when Gemini is unavailable.
- `/api/narrate` provides narrator descriptions with Groq integration and local fallback descriptions.
- `AIHintDialog` sends a stable `playerId` and `puzzleId` so hint progression is tracked consistently.

ChatGPT and Codex were used to debug frontend typing issues, stabilize server
actions, and make the AI dialogs robust when the runtime model is unavailable.
Claude helped shape clearer user-facing wording so the hint and narration UI
felt consistent with the game's tone.

### Final Game Flow

AI assistance was used to implement the final escape flow in Level 5:

- final door completion state;
- victory screen;
- elapsed time and remaining time display;
- score calculation;
- final progress persistence with `escapeRoomCompletedLevel = "5"`;
- confetti feedback.

AI was also used to tighten the multiplayer experience across the levels:

- shared room state and synchronized puzzle progress;
- room-based timer persistence;
- role-aware interactions for team play;
- realtime player presence and lobby updates;
- inventory and puzzle state sync across teammates.

### Testing and CI

AI assistance was used to create a focused Python unit test suite:

- `test_puzzle_agent.py`
- `test_hint_agent.py`
- `test_narrator_agent.py`
- `test_game_logic.py`

The suite currently contains 17 tests and passes with:

```powershell
python -m unittest discover -s tests -p "test_*.py"
C:\tmp\mds-escape-room-venv\bin\python.exe -m pytest tests
```

AI assistance was also used to add GitHub Actions CI:

- Python unit tests with `pytest`;
- frontend dependency installation with `npm ci`;
- frontend production build with `npm run build`.

AI was used to design the test scope as well:

- identify the most fragile behaviors in the agent layer;
- create regression tests for puzzle validation and fallback logic;
- verify that runtime AI features still behave deterministically when API keys
  are missing;
- keep the CI pipeline strict enough to catch frontend type errors before
  merge.

### Bug Fixing and Pull Requests

AI was used during bug fixing and branch hygiene:

- to interpret CI failures and reduce type-related regressions;
- to resolve merge conflicts from `main` cleanly;
- to keep commits small and focused;
- to draft English commit messages and merge descriptions;
- to validate fixes before pushing the branch back to GitHub.

This work was paired with pull requests and branch-based review, so the final
code was always verified before it reached the main development line.

### Documentation and Reporting

Claude and ChatGPT were used to draft and refine the long-form documentation in
the repository:

- README structure and section ordering;
- AI usage report drafting;
- backlog summaries and sprint notes;
- explanatory text for the multiplayer and agent systems;
- concise notes for diagrams, tests and CI.

This report itself is part of that documentation effort and is intended to show
how AI was used in a traceable and honest way.

### Example Prompts Used During Development

The following prompts are representative examples of the kinds of instructions
the team used with AI tools during the project. They are not exact transcripts
of every conversation, but they reflect the real development tasks we delegated
to AI and the level of specificity we used.

#### Requirements and backlog

```text
I am building a university project called AI Escape Room. Please help me turn
this idea into a structured product backlog with at least 10 user stories.
The project is a multiplayer escape room built with Next.js, TypeScript, Python
and Supabase. Include stories for exploration, puzzle solving, inventory,
AI-powered hints, narration, multiplayer sync, shared timers, roles and a team
leaderboard. For each story, provide a short title, a user story statement, and
clear acceptance criteria. Keep the backlog realistic for a semester project
and make the ordering suitable for incremental delivery across several sprints.
```

```text
Rewrite these rough backlog notes into professional user stories with clear
acceptance criteria and a sprint breakdown. I need them to be suitable for a
GitHub repository README and for a lab presentation. Make sure the language is
concise, testable and aligned with agile terminology.
```

#### Architecture and diagrams

```text
Create a high-level architecture description for an escape-room game with a
Next.js frontend, a Python backend, Supabase persistence and three AI agents:
Puzzle Agent, Hint Agent and Narrator Agent. I also need a Mermaid diagram that
shows the relationships between frontend, backend, database, agent layer and
multiplayer synchronization. Use clear labels and keep it readable for a README.
```

```text
Generate a Mermaid sequence diagram for the flow of a hint request in the game.
Include the player, the UI, the API route, the hint agent, the fallback logic
and the response back to the browser. The diagram should show both the normal
LLM path and the fallback path when the API key is missing or the request times
out.
```

#### Implementation and debugging

```text
I have a TypeScript build error in a Next.js file related to a component prop
type mismatch. Help me reason about the error, identify the most likely cause,
and suggest a minimal fix that preserves the existing component design. Keep the
solution compatible with CI and avoid unnecessary refactoring.
```

```text
I need to make the multiplayer lobby state survive reloads and remain synced
with Supabase. Please suggest a clean implementation strategy for storing room
state, player progress and remaining time, while keeping guest and authenticated
users consistent. Focus on predictable behavior, fallback logic and testability.
```

```text
Please help me refactor this game logic so that the timer, win condition and
progress persistence are easier to test. The code should remain compatible with
React and Next.js, and it should be safe to run in CI without external API keys.
```

#### AI agents and fallback behavior

```text
Design a Hint Agent that never reveals the full answer. It should provide
progressive hints in three levels: vague, moderate and specific. Add a cooldown
between requests, include fallback behavior when no model is available, and
keep the response in a Victorian mystery style.
```

```text
Create a Narrator Agent prompt that generates atmospheric descriptions of
objects and rooms. The style should be immersive, consistent and slightly
dramatic, but it must not spoil puzzle solutions or reveal hidden mechanics.
```

```text
Help me write a deterministic fallback for answer validation when the LLM API is
not available. The fallback should still be useful during gameplay, should not
break the user experience, and should integrate with the existing logging and
attempt tracking.
```

#### Testing and CI

```text
Design a test plan for this project that covers the AI agents, the multiplayer
state, the timer persistence and the frontend build. Include both unit tests and
CI checks. I want the tests to catch regressions in hint behavior, answer
validation and synchronization between players.
```

```text
Write pytest tests for the puzzle agent and hint agent. Focus on solution
validation, progressive hints, cooldown handling, and ensuring that the agent
never leaks the exact answer. Keep the tests deterministic and friendly to CI.
```

```text
I need a GitHub Actions workflow that runs Python tests and a frontend build on
every push and pull request. Please keep the workflow simple, reliable and
appropriate for a student project. It should fail fast when tests or the build
do not pass.
```

#### Documentation

```text
Draft a README section that explains the AI Usage in Development for a student
project. Mention the tools used, what each tool contributed, how the code was
validated, and what was reviewed manually. Make the tone professional and make
it suitable for a grading rubric.
```

```text
Expand this AI usage report so it sounds more complete and convincing for a
university evaluation. Include concrete examples of where AI helped with
requirements, architecture, coding, debugging, testing, diagrams and CI/CD, but
be careful not to overclaim. The text should remain honest and specific.
```

## Verification Performed

The following checks were run locally after the relevant changes:

```powershell
python -m compileall src
python -m unittest discover -s tests -p "test_*.py"
C:\tmp\mds-escape-room-venv\bin\python.exe -m pytest tests
npm.cmd run build
```

Results:

- Python source compiled successfully.
- Unit tests passed: 17 tests.
- Frontend build completed successfully.
- The merge from `main` was resolved and committed successfully.

## Human Review Notes

AI-generated code was not accepted blindly. The implementation was adjusted to:

- avoid depending on external API keys for the basic gameplay loop;
- keep fallback behavior deterministic and testable;
- preserve existing local frontend changes that were already present in the working tree;
- commit work in small logical chunks on the `andra` branch;
- keep commit messages in English.
- adapt generated text and diagrams to the actual project architecture;
- make sure the repository evidence matches the rubric expectations.

## Limitations

The following items still require human/team follow-up:

- Review the exact wording of AI hints and narrator text for gameplay quality.
- Confirm the final score formula with the product owner.
- Decide whether all levels should use the new generic persistent state hook.
- Add frontend component tests or Playwright end-to-end tests if required by the grading rubric.
- Ensure the final demo link remains public and accessible during evaluation.
