# agi

A general-purpose AI agent built from scratch in TypeScript — no agent framework, just an LLM API, a tool-calling loop, and a terminal UI. This is the working repo for the **"Build an AI Agent from Scratch"** course (`course.yaml`): it's built up incrementally, lesson by lesson, and this branch (`my-journey`) reflects wherever that build currently stands.

## What's here

A terminal chat app (`agi`) that:

- Sends your messages to an LLM (OpenAI, via the [Vercel AI SDK](https://sdk.vercel.ai)) and streams the response token-by-token into a React/Ink terminal UI
- Runs an agent loop (`src/agent/run.ts`) that lets the model call tools, reads the tool results back into the conversation, and repeats until the model is done — the classic ReAct (Reason + Act) pattern
- Is traced end-to-end with [Laminar](https://www.lmnr.ai/) for observability/debugging
- Has an evals suite (also via Laminar) for testing tool-calling and multi-turn agent behavior

`src/agent/run.md` is a line-by-line deep dive on how the agent loop works and is the best starting point for understanding this codebase.

## Requirements

- Node.js 20+ (developed against v24)
- An OpenAI API key
- A Laminar project API key (optional — only needed for tracing/evals)

## Setup

```bash
npm install
```

Create a `.env` file in the project root:

```bash
OPENAI_API_KEY=sk-...
LMNR_API_KEY=...   # optional, enables Laminar tracing and `npm run eval*`
```

## Running the agent

```bash
npm run dev     # tsx watch — restarts on file changes
npm start        # tsx, no watch
```

Either command launches the terminal chat UI. Type a message and press enter; type `exit` or `quit` to leave.

To build a standalone CLI binary:

```bash
npm run build     # compiles to dist/, entry point dist/cli.js
```

## Project structure

```
src/
  index.ts                 # entry point — renders the Ink app
  cli.ts                    # CLI entry point (built as the `agi` bin)
  types.ts                  # shared types (AgentCallbacks, ToolCallInfo, ...)
  agent/
    run.ts                  # the agent loop itself (see run.md for a full walkthrough)
    run.md                  # line-by-line explainer of run.ts
    executeTools.ts          # looks up a tool by name and executes it
    system/
      prompt.ts              # the system prompt
      filterMessages.ts       # strips history messages that would break a resend
    tools/
      index.ts                # tool registry passed to the model
      dateTime.ts              # example tool: returns the current date/time
    context/
      tokenEstimator.ts        # rough token counting for messages
      modelLimits.ts            # per-model context window / threshold config
      compaction.ts              # conversation summarization/compaction helpers
  ui/
    App.tsx                  # top-level Ink component; owns conversation state
    components/               # MessageList, Input, ToolCall, ToolApproval, Spinner, TokenUsage

evals/                       # Laminar eval suites (executors, evaluators, fixture data)
notes/                       # per-lesson course notes (this repo is built lesson-by-lesson)
openspec/                    # OpenSpec change-proposal workflow (see openspec/AGENTS.md)
```

## Tools

Tools live in `src/agent/tools/` and are exported from `src/agent/tools/index.ts` as a plain object keyed by tool name — that object is passed straight to the AI SDK's `streamText`. Adding a new tool means writing a `tool({ description, inputSchema, execute })` (from the `ai` package, schemas in `zod`) and adding it to the registry.

Currently registered:

- **`dateTime`** — returns the current ISO timestamp. No arguments.

The `notes/` directory documents tools introduced in later lessons (file system read/write/list, web search, a shell tool with human-in-the-loop approval) that get layered on as the course progresses — check `src/agent/tools/index.ts` for what's actually wired in on this branch at any given time.

## In-progress pieces

A few modules exist but aren't fully wired into the agent loop yet on this branch:

- **`src/agent/context/`** — token estimation, per-model context limits, and conversation compaction are implemented but not yet called from `run.ts`.
- **Tool approval (HITL)** — `AgentCallbacks.onToolApproval` and the `ToolApproval` UI component exist, but `run.ts` doesn't currently call `onToolApproval` before executing a tool.

## Evals

Eval suites run through the Laminar CLI:

```bash
npm run eval                 # run all evals
npm run eval:file-tools       # evals/file-tools.eval.ts
npm run eval:shell-tools       # evals/shell-tools.eval.ts
npm run eval:agent              # evals/agent-multiturn.eval.ts
```

`evals/executors.ts` wraps the agent/tools under test, `evals/evaluators.ts` scores the results, and `evals/data/*.json` holds the fixture inputs/expectations. `evals/mocks/tools.ts` provides mocked tool implementations so evals don't hit real file/shell/network side effects.

For a code-level walkthrough of how eval data, executors, evaluators, mocks, and Laminar suite entry points fit together, see [`evals/evals.md`](evals/evals.md).

## Linting / formatting

Formatting and linting are handled by [Biome](https://biomejs.dev/) (`biome.json` — tab indentation, double quotes):

```bash
npx biome check .
npx biome format --write .
```

## Course materials

This repo doubles as course source material — see `CLAUDE.md` for the branch/lesson structure. `course.yaml` has the syllabus, and `notes/` has one markdown file per lesson (`01-Intro-to-Agents.md` through `09-HITL.md`) containing the code and explanations for material removed from earlier lesson branches.

## OpenSpec

Non-trivial changes in this repo go through [OpenSpec](openspec/AGENTS.md) change proposals — see `openspec/AGENTS.md` for the workflow and `openspec/project.md` for project conventions.
