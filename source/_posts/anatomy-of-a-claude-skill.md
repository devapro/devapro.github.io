---
title: "AI Skill: From Discovery Notes to a Reviewed SRS"
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
  - srs
  - developer-experience
date: 2026-05-18 11:00:00
translations:
  ru: anatomy-of-a-claude-skill-ru
excerpt:
  - A close look at one reusable AI skill that turns a rough feature draft into a complete, code-grounded SRS — and then has an independent agent review it before you trust it.
---

In [D3: Documentation Driven Development](/en/2026/06/27/documentation-driven-development/) I argued that the highest-leverage move in a feature's life is to write a complete spec *before* any code exists. In [Documentation in the AI Era](/en/2026/06/27/documentation-in-the-ai-era/) I argued that docs are the new source code, and that every agent skill is only as good as the docs it reads. Both posts lean on the same quiet assumption: that a good specification actually gets written.

That assumption is exactly where teams have always failed. So this post zooms all the way in on a single, concrete answer to "but how do you reliably produce that spec?" — one reusable **skill** that takes a rough discovery document and turns it into a polished, code-grounded SRS, then has a second agent review it before you trust the result.

## First, what is a skill?

A **skill** is a named, reusable procedure an agent can invoke — a folder containing a `SKILL.md` instruction file (and optionally helper agents, scripts, or templates) that encodes *how* to do a recurring job well. Instead of re-explaining the same multi-step process in a fresh prompt every time, you write it down once and the agent follows it: same steps, same quality bar, same output format, every run.

Think of it as the difference between telling a new hire "go write a spec" and handing them a checklist that a senior engineer refined over a dozen features. The skill is that checklist, made executable.

## The Problem: the discovery-to-spec gap

Every feature starts as something rough — bullet points in a doc, a screenshot, a paragraph from product, a few notes from a discovery call. Turning that into a specification a developer can build from is real work, and it fails in four predictable ways:

- **It stays vague.** The draft says "show the user their items." It doesn't say what a logged-out user sees, what shows while the list loads, what shows when the list is empty, or what happens when the API call fails. Those gaps are exactly where bugs are born.
- **It isn't grounded in the code.** A spec written from the draft alone invents module names, guesses at API shapes, and ignores patterns that already exist in the repo. The developer then spends the first day reconciling the spec with reality.
- **The format drifts.** Everyone writes specs a little differently, so no two documents are navigable the same way — and an LLM reading them later (see the previous two posts) gets an inconsistent corpus.
- **Nobody checks it.** The spec is trusted because it exists, not because it was verified. Mistakes survive all the way into code.

This is the expensive, boring work D3 depends on being cheap. A skill is how you make it cheap *and* reliable — not by writing faster, but by encoding the whole discipline once.

## Anatomy of the skill

The skill is a folder with two parts: a `SKILL.md` that defines the workflow, and a helper reviewer agent it spawns near the end. Here's the trigger metadata at the top of `SKILL.md`:

```markdown
---
name: discovery-to-srs
description: Converts a Markdown discovery/draft document into a polished
  Software Requirements Specification (SRS). Triggers on "write an SRS",
  "turn this discovery into docs", "document this feature", or when the
  user shares a draft describing a feature they want documented.
argument-hint: "<path-to-discovery.md>"
---
```

The `description` isn't decoration — it's how the agent decides *when* to reach for this skill. Phrasing it around the user's actual words ("I have a draft", "document this feature") is what makes invocation feel automatic rather than something you have to remember.

The body of `SKILL.md` is an eight-step workflow. The steps matter less individually than the shape they form, so here it is end to end:

```text
1. Read the discovery doc      → extract scope, screens, modules, what's vague
2. Research & fill the gaps    → search code + docs IN PARALLEL
3. Ask clarifying questions    → only what code/docs can't answer
4. Determine the location      → new vs. existing feature folder
5. Write the SRS               → follow a canonical format
6. Spawn an independent reviewer
7. Apply review feedback       → revise, re-review if needed
8. Present the result          → do NOT start implementation
```

Four of those steps are where the real leverage lives.

### Step 2 — Fill the gaps from the actual code

This is the step that separates a real spec from a polished-looking guess. Rather than expanding the draft on its own terms, the agent explores **the code and the docs in parallel** to fill in everything the draft left vague:

- In the docs: read the docs index to learn what already exists and how it's organized; if the feature already has a folder, read its existing spec and any cross-cutting technical notes (navigation, auth, deep links).
- In the code: grep for modules related to the feature; read the relevant state/logic files to learn the *actually implemented* behavior; check navigation graphs for where screens fit; read API interfaces and data models; check any feature flags gating rollout.

The instruction the skill gives here is the important one: **if a behavior is inferred from code rather than stated in the draft, it's still correct to include — you just verified it.** That single rule is what turns a vague draft into a spec grounded in what the system actually does.

### Step 3 — Ask only what you can't infer

After research, the agent identifies what's *still* unclear and asks — but the skill is explicit that this is a last resort, batched, and limited to genuine unknowns: ambiguous scope, conflicting signals between draft and code, an undescribed user state ("what should a guest see?"), or UI with no design reference anywhere. **It must not ask about anything it could answer itself from code or docs.** This is the difference between an assistant that respects your time and one that turns every task into an interview.

### Step 5 — Anchor the format to a canonical example

The skill doesn't describe the output format in the abstract; it points at a real, existing spec as the style reference and lists the required sections — overview, module-to-purpose table, per-screen functional requirements broken down **by user state** (guest, free, paid…), API integration, and feature flags. The style rules are concrete: imperative phrasing ("Tapping X opens Y"), explicit persistence ("stored locally" vs. "runtime only"), exact module names in backticks. Anchoring to an example is what keeps every spec the skill produces navigable the same way — which is precisely what makes the resulting corpus readable by the next agent.

### Steps 6–7 — An independent reviewer, with its own rubric

This is the part most home-grown prompts skip, and it's the most important. Once the SRS is written, the skill spawns a **separate reviewer agent** with a fresh context and its own instructions. It isn't a vague "check this over" — the reviewer has a real rubric:

- **Completeness** — is every screen covered? Every user state? Loading, empty, and error states? Every interactive element? Every flag?
- **Accuracy** — do the module names, API endpoints, and flag names *actually exist* in the codebase? A name that doesn't resolve is a critical issue, not a nit.
- **Consistency** — does it contradict any already-documented feature?
- **Format & open questions** — does it follow the house structure, and what would a developer still need to ask before building?

The reviewer ends with one of three verdicts — **APPROVED**, **APPROVED WITH NOTES**, or **NEEDS REVISION** — and the workflow branches on it: approve and finish, apply notes and finish, or revise and run the reviewer *again*. Its closing instruction is worth quoting: *"Be direct. Don't inflate findings to seem thorough, and don't soften critical issues to seem nice. The goal is a usable document, not a perfect score."*

Two agents, two contexts, two jobs: one writes with full knowledge of the draft and code, the other audits with fresh eyes against a checklist. That separation is what catches the writer's blind spots — the same reason we don't let people merge their own PRs unreviewed.

## Why a skill, and not just a good prompt

You could paste all of this into a chat once and get a decent SRS. The reason to make it a skill is everything that happens the *second* time:

- **Consistency.** Every spec comes out in the same shape, so the corpus stays navigable — for humans and for the agents that read it later.
- **The quality bar travels.** The gap-filling rule, the "don't ask what you can infer" rule, the reviewer's rubric — those are hard-won lessons. A skill captures them once so they apply on every run instead of living in one person's head.
- **It's a checkpoint, not a black box.** The workflow deliberately ends *before* implementation: the SRS is the deliverable, reviewed and signed off, exactly the artifact D3 wants locked before code begins.
- **It composes.** This skill produces the spec; other skills (plan a feature, implement it, review the PR) consume it. The whole D3 pipeline is skills handing typed artifacts to one another.

A prompt is a one-off. A skill is a process you can trust to run the same way at 5pm on a Friday as it did the first time you wrote it down.

## A note on tooling

I describe this with Claude and its skills format because that's what it runs on, but the *idea* is portable. A skill is just a written-down procedure plus an optional reviewer agent — any agent runtime that can read files, search a codebase, and spawn a second pass can do the same thing. The leverage isn't in the vendor; it's in three things any capable model can use: a workflow specific enough to follow step by step, the discipline to verify against real code instead of guessing, and an independent reviewer so nothing ships unchecked.

## Bottom Line

D3 says write the spec before the code. Docs-as-source-code says that spec is what every later agent will read. This skill is the small, concrete machine that makes producing that spec cheap and trustworthy: read the draft, fill its gaps from the real code, ask only what you can't infer, write it in a consistent shape, and have a second agent tear it apart before anyone relies on it. Encode that discipline once, and a rough draft becomes a reviewed reference — every time, not just when someone remembers to be careful.
</content>
</invoke>
