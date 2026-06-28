---
title: "Anatomy of an Agent-Ready Repo: Skills, Rules, and Docs That Live With the Code"
lang: en
categories:
  - AI
tags:
  - ai
  - documentation
  - llm
  - claude
  - agents
  - skills
  - android
  - developer-experience
date: 2026-06-10 12:00:00
translations:
  ru: anatomy-of-an-agent-ready-repo-ru
excerpt:
  - A guided tour of a real 100+ module Android repo laid out for an LLM agent — the `.claude/` skills, rules, and sub-agents that tell it *how* to work, and the in-repo `docs/` that tell it *what* the system does — and the concrete capability each layer unlocks.
---

My two earlier posts argued the *why*: [Documentation in the AI Era](/en/2026/06/27/documentation-in-the-ai-era/) made the case that docs are now read by an LLM on every task, and [D3](/en/2026/06/27/documentation-driven-development/) turned that into a development process. This post is the *what* — a walk through an actual repository that's been laid out for an agent, file by file, with one question asked of every layer: **what can the AI now do that it couldn't before?**

The subject is a production Android app: 100+ Gradle modules, a feature-per-module architecture, two product flavors. Big enough that no human holds it all in their head — which is exactly the condition under which an agent's ability to *navigate without guessing* stops being a nicety and becomes the whole game.

The repo has two halves that do two different jobs:

- **`.claude/`** tells the agent *how to work here* — the conventions, the procedures, the review standards.
- **`docs/`** tells the agent *what the system does* — the behavior specs, the module maps, the analytics contracts.

Neither is useful without the other. A skill that knows *how* to implement a feature still has to read a doc to learn *what* the feature is. Let's take them in turn.

## Half One: `.claude/` — How the Agent Works

```text
.claude/
├── rules/      17 topical convention files  (the rubric)
├── skills/     24 named workflows           (the procedures)
├── agents/     10 specialist sub-agents     (the reviewers)
├── hooks/      shell hooks on edit/stop     (the guardrails)
└── scripts/    deterministic helpers        (the non-AI work)
```

### Rules — the team's conventions as a checklist

`.claude/rules/*.md` are narrow, single-topic files: `mvi-architecture.md`, `navigation.md`, `app-result.md`, `webview.md`, `analytics.md`, and so on. Each one codifies *one* convention, and the format matters more than you'd expect. They aren't prose essays — they're rubrics, with ✅ correct / ❌ wrong pairs the agent can pattern-match against.

Here's the real `app-result.md`, which governs how the codebase chains fallible operations:

```kotlin
// ❌ WRONG: map with an AppResult-returning lambda → AppResult<AppResult<Profile>>
val nested = result.map { user -> fetchUserProfile(user.id) }

// ✅ CORRECT: flatMap flattens the nested result
val profile = result.flatMap { user -> fetchUserProfile(user.id) }
```

**Capability unlocked: the AI writes code that matches *your* conventions, not the statistical average of GitHub.** Without this file, a model produces idiomatic-but-generic Kotlin. With it, the model produces code that looks like the rest of *this* repo — internal visibility, no public constants, `flatMap` over manual `when`. The convention travels with the code, so it's correct on every run, for every contributor, human or model.

The clever part is the feedback loop: a skill called `/review-and-rule` watches how the codebase actually handles a pattern, then *writes or updates the rule file itself*. Conventions discovered in review become rules enforced in the next implementation. The rubric maintains itself.

### Skills — procedures, not prompts

A skill is a named, multi-phase workflow invoked with `/skill-name`. This repo has 24 of them. They're the difference between asking an agent to "implement a feature" and handing it the team's actual playbook for doing so.

`/implement-feature` is representative. It doesn't just write code — it runs phases:

1. **Interview** — asks a fixed set of requirement questions via structured prompts.
2. **Design** — derives the MVI shape (State / Action / Event / Reducer) from the answers.
3. **Scaffold** — generates the `api-*` + `feature-*` module pair.
4. **Implement** — writes real logic and Compose UI following the rules above.
5. **Self-review** — invokes the `code-reviewer` sub-agent before handing back.

Others are sharper tools: `/task-worker` takes a Jira ticket and runs it end-to-end with up to three auto-repair loops; `/check-coverage` runs JaCoCo, finds the gaps, and writes tests in batches until a target is met; `/discovery-to-srs` turns a rough draft into a structured spec and has an independent agent validate it.

**Capability unlocked: the AI executes a process instead of improvising one.** Improvisation is where agents drift — every run reinvents the approach, and quality is a coin flip. A skill pins the *steps* while leaving the *content* to the model. The result is repeatability: `/implement-feature` produces the same module shape today as it did last month, because the phases are fixed even though the code is new.

### Sub-agents — specialists with fresh context and a narrow rubric

`.claude/agents/` holds 10 sub-agent definitions, most of them reviewers: `pr-review-architecture`, `pr-review-compose`, `pr-review-performance`, `pr-review-tests`, `pr-review-package-structure`, `pr-review-code-quality`. The `/review-pr-advanced` skill fans all six out **in parallel**, each in its own context window, each handed exactly one job.

The architecture reviewer's prompt is a tight checklist — "Reducers call Use Cases, not Repositories", "every implementation class must be `internal`", "navigation goes through a Router interface" — and it's explicitly told *not* to review formatting or Compose perf, because other agents own those.

**Capability unlocked: depth without dilution.** A single agent asked to "review this PR" spreads its attention thin and its context fills with noise. Six specialists, each with a focused rubric and a clean context, each catch things a generalist misses — and they run concurrently, so the wall-clock cost is one review, not six. This is the *find → specialize → verify* shape that one big prompt can't replicate.

### Hooks and scripts — the parts that shouldn't be AI

Two more layers round it out. **Hooks** (`post-edit-review-reminder.sh`, `pre-stop-review-check.sh`) are shell scripts the harness fires on edit and before the agent stops — they nudge the review step so it can't be silently skipped. **Scripts** (the JaCoCo XML parsers, the doc-index generators) are plain Python: deterministic work that would be wasteful and unreliable to do with a model.

**Capability unlocked: the agent knows what *not* to think about.** Parsing an XML coverage report doesn't need a language model; enforcing "review before you stop" shouldn't depend on the model remembering to. Pushing this work into hooks and scripts makes the system both cheaper and more reliable — the AI spends its tokens on judgment, not bookkeeping.

## Half Two: `docs/` — What the System Does

The product documentation lives in a **nested git repository** cloned at `docs/`, with the actual content under `docs/docs/`. That nesting is deliberate (more on *why in the repo* below), but the structure inside is the interesting part:

```text
docs/docs/
├── INDEX.md          module → feature lookup  (generated)
├── llms.txt          curated manifest for agents
├── STYLE.md          machine-checkable doc conventions
├── GLOSSARY.md       acronyms (WL, LP, SRS, TNB…)
├── features/
│   └── <Feature>/
│       ├── README.md         folder index    (generated)
│       ├── modules.md        module map       (source of truth)
│       ├── <Feature>.srs.md  the primary spec
│       ├── analytics/        event specs
│       ├── _drafts/          WIP  (status: draft)
│       └── _archive/         deprecated
└── technical/        cross-cutting reference
```

### INDEX.md — the lookup table that kills blind search

`INDEX.md` maps every one of the ~265 code modules to the feature it belongs to:

```text
| `:features:feature-alerts-feed`       | Alerts            |
| `:features:feature-instrument-tab-news` | Instrument screen |
| `:services:service-deep-links`        | Deep links        |
```

Crucially, the module → feature section is **generated** from each feature's `modules.md` by a Python script — so it can't drift from reality by hand.

**Capability unlocked: the agent's first move is a lookup, not a search.** Drop the model into a 100-module repo with no index and "where does the alerts feed live?" becomes a fan-out of greps and guesses. With `INDEX.md`, it's one hop: module → feature folder → spec. Every skill in the repo starts from this same hop. The 45 feature folders mean the difference between an agent that explores and an agent that *retrieves*.

### llms.txt and STYLE.md — a contract for machine readers

`llms.txt` is the [emerging convention](https://llmstxt.org) for an AI entry point: a curated manifest pointing at each feature's *primary* spec, with drafts and archives deliberately excluded so the agent reads the authoritative doc first.

`STYLE.md` is the part I find most underrated. It's a style guide that's actually *enforceable*: every doc must declare a `type` from a fixed enum (`srs`, `overview`, `api`, `analytics`…), every spec must cover the three user states (guest / registered / subscribed), filenames follow a canonical pattern — and a CI gate (`check-doc-filenames.py`, `run-quality-gates.py`) fails the build when they don't.

**Capability unlocked: AI-*written* docs come out uniform.** When `/discovery-to-srs` or the Jira pipeline generates a spec, `STYLE.md` is the schema it writes against — so machine-authored docs land in the same shape as hand-written ones, and the next agent that reads them knows exactly where to look. A style guide that a human merely *reads* is advisory; one that's an enum plus a CI gate is a contract both sides honor.

### modules.md and the lifecycle folders — honesty over time

Each feature's `modules.md` is the **source of truth** for which code belongs to it, and the rule is that adding a module in code means updating `modules.md` in the *same PR*. The `_drafts/` and `_archive/` subfolders, gated by a `status` field, keep work-in-progress and dead docs from polluting what the agent treats as authoritative.

**Capability unlocked: the agent can trust what it reads.** The single most expensive failure mode for doc-driven AI is confidently acting on a stale spec — it never throws an error, it just does the wrong thing. Same-PR module updates and explicit lifecycle status are the cheap, unglamorous machinery that keeps "the docs say X" and "the code does X" from diverging.

## The Connective Tissue

The two halves meet in a single invariant that every skill follows: **resolve, read, then act.**

```text
Jira ticket  →  INDEX.md (module → feature)
             →  modules.md (which modules)
             →  <Feature>.srs.md (documented behavior)
             →  implement, guided by .claude/rules/*
             →  review via specialist sub-agents
             →  /update-docs flags which specs drifted
```

`task-worker` lives this loop end to end. It never guesses where a feature is or how it should behave — it looks both up, builds against the documented contract, implements under the rules, reviews with the specialists, and then checks whether its own changes made the docs stale. The systems from the first post — the Doc-Chat Q&A bot, the Jira→Docs pipeline — are just *more consumers* of this same structure. They work because the index, the specs, and the rules already exist for them to read.

## What the AI Can Do Now — The Short Version

| Layer | Capability it unlocks |
|---|---|
| `.claude/rules/` | Writes code in *your* conventions, not the GitHub average |
| `.claude/skills/` | Runs a repeatable process instead of improvising one |
| `.claude/agents/` | Deep, parallel review — specialists, not one tired generalist |
| `.claude/hooks` + `scripts/` | Spends tokens on judgment; offloads bookkeeping |
| `docs/INDEX.md` | Retrieves by lookup instead of searching blind |
| `docs/llms.txt` + `STYLE.md` | Reads the right doc; writes new ones in a uniform shape |
| `modules.md` + lifecycle | Trusts what it reads — docs don't silently rot |

## Why *In the Repo* Specifically

Every benefit above depends on this context living in the repository, not in Confluence or a wiki. Four reasons, all of which compound:

- **Auto-loaded.** `CLAUDE.md` and `.claude/` are pulled into every agent session with zero setup. A wiki page has to be found, fetched, and pasted — which means it usually isn't.
- **Version-locked.** The docs are at the same commit as the code. Check out a branch from six months ago and you get *that* branch's specs and rules — no "which version of this Confluence page matches this tag?" guesswork.
- **Same diff.** A behavior change and its doc update ride the same PR, reviewed together. `/update-docs` exists precisely to keep that link tight. Confluence updates happen weeks later, if ever.
- **Greppable and cache-friendly.** Plain text on the live filesystem means an agent can `Grep` the *current* state — no embedding index to re-sync (the no-vector-DB argument from the first post). And low-churn plain text keeps the prompt cache warm, which is a real cost line at scale.

## Bottom Line

An agent-ready repo isn't one big clever prompt. It's two boring, layered halves: a `.claude/` that encodes *how the team works* and a `docs/` that encodes *what the system does* — joined by the discipline of *resolve, read, act*. Each file is small and unglamorous on its own; together they're the difference between an AI that explores your codebase and one that *operates* it.

The investment is real, but it's the same investment that makes a codebase legible to a new senior engineer — and now you're making it once for every future agent run as well. Start with the three files from the first post (`CLAUDE.md`, a few rules, an index), ship one skill, and let `/review-and-rule` grow the rest from what your reviews already know.

### Further Reading

- [Documentation in the AI Era: Docs Are the New Source Code](/en/2026/06/27/documentation-in-the-ai-era/) — the systems built on top of this structure
- [D3: Documentation Driven Development](/en/2026/06/27/documentation-driven-development/) — the process that produces the specs
- Anthropic — [Claude Code best practices](https://docs.anthropic.com/en/docs/claude-code) and [Agent Skills](https://code.claude.com)
- [llms.txt](https://llmstxt.org) — the machine-readable entry-point convention
</content>
</invoke>
