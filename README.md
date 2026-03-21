# AI Escape Room - Intelligent Puzzle Solving System

A text and AI-driven escape room game where players explore a virtual room, collect items, solve puzzles, and interact with an intelligent multi-agent AI system to progress toward a final objective.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Architecture](#architecture)
- [AI Agents](#ai-agents)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [CI/CD](#cicd)
- [Backlog Summary](#backlog-summary)
- [Definition of Done](#definition-of-done)
- [Team](#team)

---

## Project Overview

AI Escape Room is a browser-based puzzle game powered by a large language model backend. The player is placed inside a virtual room and must explore the environment, collect evidence, solve logic and cipher puzzles, and interact with an AI assistant to receive narrative descriptions, contextual hints, and solution validation.

The system is built around three specialised AI agents: a Puzzle Agent that validates solutions, a Hint Agent that delivers progressive clues without spoiling answers, and a Narrator Agent that generates immersive descriptions of the game world.

---

## Features

**Exploration and Interaction**
- Navigate and inspect a room populated with interactive objects
- Examine items to reveal clues embedded in the environment
- Collect items into a persistent inventory for later use

**Puzzle System**
- Multiple puzzle types including logic, pattern recognition, and cipher challenges
- Code-based locks that accept numeric or text input
- Validation with success and failure feedback at every step

**Inventory**
- Pick up and store collectable items during exploration
- Browse the full inventory with item names, icons, and descriptions
- Combine items to unlock additional puzzle paths

**AI Interaction**
- Open a free-text chat interface to ask questions about the game world
- Receive contextual hints when stuck, delivered in three escalating levels
- Trigger atmospheric descriptions of objects and areas via the Narrator Agent
- All AI responses are context-aware and reference current game state

**Game Logic**
- Real-time progress tracking across all puzzle states
- Visual and audio feedback on puzzle completion
- Final door unlock sequence triggered only when all puzzles are solved
- Victory screen displaying total elapsed time and score

---

## Architecture

```
src/
    agents/
        puzzle_agent.py       # Validates puzzle solutions via LLM
        hint_agent.py         # Generates progressive contextual hints
        narrator_agent.py     # Produces atmospheric environment descriptions
    game/
        room.py               # Room state and object management
        inventory.py          # Item collection and storage logic
        puzzle_engine.py      # Puzzle state machine and progression
        game_logic.py         # Win condition and feedback controller
    api/
        routes.py             # REST endpoints for frontend communication
    frontend/
        index.html
        game.js
        style.css
tests/
    test_puzzle_agent.py
    test_hint_agent.py
    test_narrator_agent.py
    test_game_logic.py
.github/
    workflows/
        ci.yml                # Build and test pipeline
```

---

## AI Agents

### Puzzle Agent

Receives a player solution and the current puzzle definition. Returns a verdict of correct or incorrect, logs the attempt with a timestamp, and assigns a difficulty rating to the interaction.

### Hint Agent

Receives the current player progress state and the active puzzle identifier. Returns a hint at the appropriate escalation level (1 = vague, 2 = moderate, 3 = specific) without ever disclosing the full solution. A minimum cooldown of 60 seconds applies between hint requests for the same puzzle.

### Narrator Agent

Receives an object or area identifier and returns a consistent, atmospheric description in the style of Victorian mystery fiction. Descriptions vary across repeated queries to maintain immersion.

All agents are invoked via internal API calls and must respond within 3 seconds under normal operating conditions.

---

## Getting Started

**Prerequisites**

- Python 3.11 or higher
- Node.js 18 or higher
- An Anthropic API key or compatible LLM endpoint

**Installation**

```bash
git clone https://github.com/your-org/ai-escape-room.git
cd ai-escape-room
pip install -r requirements.txt
```

**Configuration**

Create a `.env` file in the project root:

```
LLM_API_KEY=your_api_key_here
LLM_MODEL=claude-sonnet-4-20250514
MAX_HINT_LEVEL=3
HINT_COOLDOWN_SECONDS=60
AGENT_RESPONSE_TIMEOUT_SECONDS=3
```

**Running the Application**

```bash
python src/api/routes.py
```

Open `http://localhost:5000` in your browser.

---

## Running Tests

```bash
pytest tests/ --cov=src --cov-report=term-missing
```

Minimum required coverage is 80 percent across all modules. All critical paths including agent integration, puzzle state transitions, and win condition logic must have dedicated test cases.

To run a specific test file:

```bash
pytest tests/test_puzzle_agent.py -v
```

---

## CI/CD

The project uses GitHub Actions for continuous integration. The pipeline runs on every push and pull request to the `main` branch.

Pipeline steps:

1. Checkout repository
2. Set up Python environment
3. Install dependencies
4. Run the full test suite
5. Generate coverage report
6. Block merge if any test fails or coverage drops below 80 percent

The workflow configuration is located at `.github/workflows/ci.yml`. Failure notifications are sent to the team via the configured channel. No code reaches `main` without a passing build.

---

## Backlog Summary

The project is organised into seven epics across three sprints with a total of 69 story points.

| Sprint   | User Stories                         | Story Points |
|----------|--------------------------------------|--------------|
| Sprint 1 | US1, US2, US3, US4                   | 14           |
| Sprint 2 | US5, US6, US7, US8, US10, US12, US13 | 33           |
| Sprint 3 | US9, US11, US14, US15, US16          | 22           |

Epics:

- Exploration (US1, US2): Room navigation and object interaction
- Puzzle System (US3, US4): Core puzzle mechanics and code unlocking
- Evidence / Items (US5, US6): Item collection and inventory management
- AI Interaction (US7, US8, US9): AI-powered chat, hints, and narration
- Game Logic (US10, US11): Feedback, progression, and win condition
- AI System (US12, US13, US14): Puzzle, Hint, and Narrator agents
- Development (US15, US16): Automated tests and CI/CD pipeline

The full backlog including acceptance criteria, story points, MoSCoW classification, and dependencies is maintained in `docs/backlog.xlsx`.

---

## Definition of Done

A user story is considered complete when all of the following criteria are met:

- Code has been reviewed by at least one peer and all comments are resolved
- Code follows the agreed naming conventions and project style guide
- Unit tests are written for all new functions and components
- All existing tests pass with no regressions
- Code coverage is 80 percent or above for the affected module
- AI agent responses are within the 3-second SLA
- Agent outputs have been reviewed for quality and relevance
- Hint Agent outputs do not expose complete puzzle solutions
- All acceptance criteria for the story are verified by QA
- Product Owner has reviewed and signed off the story
- Code is documented with docstrings or inline comments where appropriate
- Build pipeline passes on the feature branch before merge to main
- No hardcoded credentials or API keys exist in source code
- UI elements meet WCAG 2.1 AA colour contrast standards
