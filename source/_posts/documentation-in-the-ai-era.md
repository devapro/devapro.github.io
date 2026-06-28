---
title: "Documentation in the AI Era: Docs Are the New Source Code"
lang: en
categories:
  - AI
tags:
  - ai
  - documentation
  - llm
  - claude
  - agents
  - developer-experience
date: 2026-04-26 19:30:00
translations:
  ru: documentation-in-the-ai-era-ru
excerpt:
  - Two concrete systems for keeping docs alive in an AI codebase — a multi-agent Doc-Chat with no vector DB, and an automated Jira to Docs pipeline — plus the reasoning and copy-pasteable examples behind them.
---

For most of software history, documentation was a courtesy to the next human. Today the first reader of your code is an LLM agent, and it reads your docs *every single time* it opens a feature, plans a refactor, or writes a test. Undocumented code has effectively become invisible code: the model cannot reason about what it cannot find.

But writing docs is only half the battle — two problems show up right after, and they are the ones the rest of this post is about.

- **Good docs go unread when they are hard to reach.** The answer to "how does feature X work?" is usually already in `docs/` or the code, but finding it means knowing the repo by heart. So people ping a colleague instead, and that colleague stops their own work to re-explain something the repo already documents.
- **Docs drift.** The moment code changes, the docs quietly stop being true. That failure never surfaces as a stack trace — it surfaces as "the agent (or the new hire) did the wrong thing," which is far harder to attribute and much more expensive to discover.

The two systems below attack exactly these: a multi-agent **Doc-Chat** that makes your docs and code instantly queryable, and an automated **Jira → Docs** pipeline that keeps them current. Both assume you *already* have documentation worth maintaining — they amplify that investment, they don't replace it. And both are concrete enough to copy.

## Doc-Chat: Multi-Agent Q&A Over Docs and Code

Doc-Chat directly solves the first problem: it turns existing documentation into something you can ask questions of, in the place where the team already talks. It is worth stressing that this only pays off *because* the docs exist — Doc-Chat is an amplifier on a documentation investment, not a way to skip it. Point it at an empty `docs/` and you get an eloquent way to say "I don't know."

It is one brain behind several interfaces: a web app at the desk and a chat bot. Both let any team member ask a question about the codebase and get a sourced, streamed answer. The bot started in Slack, but nothing about it is Slack-specific — the same backend drives a **Telegram** bot just as well, and in principle any platform with a bot API (Discord, Microsoft Teams, …) plugs into the same place. Meet people where they already chat instead of asking them to open one more tool.

The interesting decision is what it *isn't*: it is intentionally **not** a RAG pipeline with embeddings. It is a multi-agent system that searches docs and code in parallel using the filesystem tools the Claude Agent SDK already provides.

```text
Client (Lit + Vite)          Server (Express + Agent SDK)
  chat UI, markdown      ──►  Orchestrator Agent
  rendering, SSE              ├── Docs Agent  (docs tree)
                             ├── Code Agent  (ripgrep over repo)
                             └── Answer Agent (synthesizes)
```

- **Orchestrator** — routes the question, fans out, merges results.
- **Docs Agent** — searches the docs tree via SDK tools (Read, Glob, Grep).
- **Code Agent** — runs ripgrep over the repo.
- **Answer Agent** — synthesizes the final user-facing response.

On the client side, Lit + TypeScript + Vite keeps the framework under 5 KB with no virtual DOM; answers stream over Server-Sent Events; markdown is rendered with `marked` + `DOMPurify` + `highlight.js`. The server is Express plus `@anthropic-ai/claude-agent-sdk`, deployed via Docker Compose.

**Why no vector DB?** On a corpus this size, an agent that greps the live filesystem always reads the *current* state of the repo. An embedding index reads a snapshot — and the moment code changes, that snapshot is stale until someone re-embeds and re-syncs it. The embed/sync/staleness loop is exactly the maintenance burden that quietly kills most RAG systems, and it buys you nothing when `Glob` + `Grep` already answer the question. Skip the index; let the agent search. Running it as a chat bot lowers the activation cost even further: nobody has to leave Slack or Telegram to ask "how does X work?"

## The Auto-Update Workflow: Keeping the Brain Healthy

Doc-Chat is only as good as the docs it reads, so the second system keeps those docs fresh automatically. A GitHub Actions workflow fires the moment a Jira ticket transitions from **Tech Review → Ready for Dev** — that is, as soon as scope is locked and *before* a line of code is written. That timing is the non-obvious part: most teams reach for "update docs when the ticket is Done," which means docs are written retroactively, weeks later, when nobody remembers the context. Triggering at *Ready for Dev* lands the docs alongside the spec while the reasoning is fresh, and gives the implementing engineer a documented target to build against.

The pipeline has four typed stages — and the key idea is matching model cost to task difficulty rather than throwing one big agent at everything:

1. **Triage (cheap model + MCP).** A Haiku-class model fetches the ticket via an automation MCP, applies field filters, and decides whether docs are even needed. It skips bug fixes, dependency bumps, and refactors — roughly $0.001 per run, so 90% of tickets are rejected for a tenth of a cent before any expensive model wakes up.
2. **Main agent.** The default (strong) model runs with the code repo as its working directory, so it automatically loads `CLAUDE.md` and `.claude/`. It reads the docs index, maps changed modules to docs, edits files, and commits — but does *not* push yet.
3. **Review agent.** A second strong-model pass looks at `git diff HEAD~1` and checks quality rules: no business metrics, no trivial restatement of code, adequate logic coverage. Returns a JSON list of issues.
4. **Fix & PR.** If issues were found, a fix agent applies corrections, then the workflow pushes to a `docs/jira-<ticket>` branch and opens (or updates) a PR.

The filter config that gates stage 1 is just data, which makes the whole thing tunable without touching agent code:

```ts
// config.ts — what counts as a docs-worthy ticket
export const filters = {
  issueTypes: ["Task"],                 // [] = allow all
  projects: ["AND"],
  requiredLabels: [],
  excludedLabels: ["no-docs", "found_by_automation"],
};
```

This is the workflow pattern Anthropic recommends in *Building Effective Agents*: triage cheap, work strong, review strong, fix only when needed. Cost stays predictable, failures stay localized, and each stage is independently testable — the opposite of a single agent looping over a giant tool surface.

## What Makes a Repo Agent-Readable

Both systems lean on the same foundation: a repo laid out so an agent can navigate it without guessing. Three files do most of the work.

**`CLAUDE.md` at the repo root** is loaded into every agent session automatically. Treat it as the boot config for a new hire who happens to be a model — terse, factual, no marketing:

```markdown
# CLAUDE.md

## Build & test
- Build:  ./gradlew assembleDebug
- Test:   ./gradlew testDebugUnitTest
- Lint:   ./gradlew ktlintCheck

## Conventions
- One feature per module under :features/<name>
- ViewModels expose a single UiState; no LiveData in new code
- Network results wrapped in AppResult<T>, never raw exceptions

## Gotchas
- WebView screens must use SafeWebViewClient (see .claude/rules/webview.md)
- Run ./scripts/gen-translations.sh after editing strings.xml
```

**`.claude/rules/*.md`** hold narrow, topical guidelines that travel with the code (one file per concern: `webview.md`, `app-result.md`, …). Sub-agents read the relevant rule as their rubric instead of re-deriving conventions every run.

**A docs index** (`docs/INDEX.md`, or the `llms.txt` convention) maps modules to their docs so an agent's *first* step is always "look up where this lives," not a blind search. This single hop is what lets every skill below start from the right document.

## Docs Power Every Skill

Once that foundation exists, skills — reusable, named procedures the agent invokes (`/implement-feature`, `/task-worker`, `/check-coverage`) — all share one pattern: **read the relevant doc, then act.**

- `task-worker` fetches a Jira ticket, reads the docs index to find the feature folder, opens its spec, then writes a plan grounded in the documented behavior.
- `implement-feature` discovers existing patterns through docs first, so new code matches documented conventions instead of inventing its own.
- `review-pr-advanced` spawns specialist sub-agents (architecture, Compose, package structure, tests, performance), each reading the relevant `.claude/rules/*.md` as its rubric.
- `check-coverage` runs JaCoCo and uses module docs to understand *what* should be tested — so it writes meaningful tests, not coverage-padding ones.

The invariant: every skill is only as good as the docs it consumes. The day docs rot is the day every skill silently degrades — invisibly, because the output still compiles.

## The Idea Underneath: Software 3.0

None of this is specific to one stack; it follows from a shift two people have named clearly.

Andrej Karpathy frames it as **Software 3.0** — after 1.0 (handwritten code) and 2.0 (learned weights), programs are now partly expressed as natural-language prompts to an LLM. In that view your code, docs, configs, and prompts are all input tokens, and the LLM is the runtime: the context window is RAM, your docs are the disk. The practical corollary is to make the repo LLM-friendly — plain text, explicit conventions, examples over prose, one source of truth per feature kept *in the repo*, not buried in Confluence. Even "vibe coding," his own term, isn't an argument against structure: clearer specs make the vibes converge faster.

Anthropic's guidance for Claude Code and the Agent SDK lands in the same place from the engineering side: clear, structured, repo-resident context beats clever prompting, and prompt-cache hit rates collapse when docs churn for cosmetic reasons — so high-quality, *low-churn* writing is also a cost optimization. Both views reduce to one instruction: give the agent the same context you'd give a senior engineer on day one, and keep it true.

### This isn't tied to one model

The examples above use the Claude Agent SDK because that's what these systems run on, but nothing in the *approach* is Claude-specific. The architecture is the portable part:

- **Doc-Chat** needs an LLM that can call tools in a loop (read a file, grep, decide what to read next) and stream tokens. Any function-calling model behind any agent framework — OpenAI's SDK, LangChain/LangGraph, a local model via Ollama with a tool-use wrapper — slots into the orchestrator/docs/code/answer roles unchanged. The "no vector DB, just grep the live repo" decision is model-independent entirely.
- **The Jira pipeline** is a cost-tiered workflow: a cheap model triages, a strong model writes, a strong model reviews. Swap in whatever cheap/strong pair your provider offers — the stage boundaries, the JSON hand-offs, and the trigger timing don't change.
- **The repo conventions** are the most portable of all. `CLAUDE.md` is just the filename Claude Code auto-loads; the underlying idea — a root context file, topical rule files, a docs index — works for any agent. Other tools read their own equivalents (`AGENTS.md`, `.cursorrules`, `llms.txt`), and you can symlink or generate them from a single source so every model reads the same truth.

In short: pick the model that fits your budget and privacy constraints. The leverage comes from the docs and the workflow shape, not the vendor.

## Bottom Line

In a Software-3.0 world, docs are not the polite afterthought they were in the 2010s — they are part of the program, and they decay the moment the code moves underneath them. The two systems here are a working answer to that: Doc-Chat lets you *query* the brain without a vector DB to maintain, and the Jira pipeline keeps the brain *honest* by writing docs while the context is still fresh. Both rest on the same cheap, unglamorous foundation — a `CLAUDE.md`, a few rules files, and a docs index — and both pay for themselves on every future agent run.

### Further Reading

- Andrej Karpathy — [Software 2.0](https://karpathy.medium.com/software-2-0-a64152b37c35) (2017), and his "Software 3.0 / LLM OS" talks (2024–2025)
- Anthropic — [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) (Dec 2024)
- Anthropic — [Claude Code best practices](https://docs.anthropic.com/en/docs/claude-code)
- [Model Context Protocol](https://modelcontextprotocol.io) — the open protocol for plugging tools into LLM agents
- [llms.txt](https://llmstxt.org) — a machine-readable entry-point convention for repos
