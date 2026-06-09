
# AI Usage Report

## Scope

This document records how AI assistance was used during the development of the
AI Escape Room project. It focuses on implementation support, debugging,
documentation and quality checks. Human developers remained responsible for
reviewing, adapting and accepting all generated changes.

## Tools Used

| Tool | Usage |
|---|---|
| ChatGPT / Codex | Code generation, refactoring support, backlog analysis, documentation drafting and test design |
| Groq API | Runtime AI hint generation through `/api/hint`, and dynamic puzzle generation for Level 2 and Level 4 |
| Gemini API | Semantic answer validation for riddles across levels through `/api/validate-answer` |
| ElevenLabs API | High-quality atmospheric Text-to-Speech (TTS) voice generation for the game's narrator |
| Deterministic fallback logic | Local non-LLM behavior for hints, narration, validation, and generation when API keys are missing or requests timeout |

## Development Contributions

### Backend Agents

AI assistance was used to scaffold and refine the Python backend layer:

- `PuzzleAgent` for answer validation, aliases, fuzzy matching and attempt logs.
- `HintAgent` for progressive hints, cooldown handling and solution leak protection.
- `NarratorAgent` for Victorian mystery style descriptions.
- `PuzzleEngine`, `Inventory`, `Room` and `EscapeRoomGame` for backend game state coordination.
- FastAPI routes for health checks, state snapshots, answer validation, hints and narration.

The generated code was reviewed and verified locally with Python compilation and
unit tests.

### Frontend AI Features & Routes

AI assistance was used to implement and improve the following Next.js serverless AI endpoints:

- **Semantic Input Validation (`/api/validate-answer`)**: Uses the Gemini API (`gemini-flash-latest`) to semantically validate player inputs against expected concepts across levels. It allows for typos, variations, and creative descriptions without strict hardcoded matching, and returns atmospheric feedback. Deterministic fallback provided.
- **Dynamic Content Generation Level 2 (`/api/level2/generate`)**: Uses Groq (`llama-3.1-8b-instant`) to dynamically generate an alchemical journal with a mystic title, 3 puzzle gates, and 3 chemistry-themed riddles (anagram, cipher, and direct question) in a strict JSON format. 
- **Dynamic Content Generation Level 4 (`/api/level4/generate`)**: Uses Groq (`llama-3.1-8b-instant`) to dynamically create 3 random short-word puzzle questions specifically sanitized for the final stage.
- **ElevenLabs Voice Integration (`/api/tts`)**: Implemented a creepy, atmospheric Text-to-Speech using the `eleven_multilingual_v2` model and the specific voice ID for Callum ("N2lVS1w4EtoT3dr4eOWO"). Audio parameters (stability 0.5, similarity_boost 0.75) are fine-tuned for a raspy, intense narration that buffers directly to the frontend.
- **Progressive Hints (`/api/hint`)**: Supports progressive hint levels, per-player cooldown and local fallback behavior.
- **Narrator Descriptions (`/api/narrate`)**: Provides narrator descriptions with Groq integration and local fallback descriptions.
- `AIHintDialog` sends a stable `playerId` and `puzzleId` so hint progression is tracked consistently.

### Final Game Flow

AI assistance was used to implement the final escape flow in Level 5:

- final door completion state;
- victory screen;
- elapsed time and remaining time display;
- score calculation;
- final progress persistence with `escapeRoomCompletedLevel = "5"`;
- confetti feedback.

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

## Human Review Notes

AI-generated code was not accepted blindly. The implementation was adjusted to:

- avoid depending on external API keys for the basic gameplay loop;
- keep fallback behavior deterministic and testable;
- preserve existing local frontend changes that were already present in the working tree;
- commit work in small logical chunks on the `andra` branch;
- keep commit messages in English.

## Limitations

The following items still require human/team follow-up:

- Review the exact wording of AI hints and narrator text for gameplay quality.
- Confirm the final score formula with the product owner.
- Decide whether all levels should use the new generic persistent state hook.
- Add frontend component tests or Playwright end-to-end tests if required by the grading rubric.
