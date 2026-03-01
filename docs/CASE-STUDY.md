# Building Quorum: A Tri-Model AI Workspace in a Day

I wanted a tool that sends the same prompt to Claude, ChatGPT, and Gemini simultaneously. Three columns, three independent conversations, streaming side by side. A cross-feed button takes each model's latest response and shares it with the other two, so they challenge each other's thinking. I use this daily for code review, research, and iterative reasoning across models.

This tool didn't exist. Too niche for any company to build, too tedious to replicate manually across three browser tabs. So I built it in a day.

The interesting part is how.

## The Setup

I've been developing a playbook for AI-native product engineering: a structured approach where AI agents handle implementation and you focus on defining what to build and why. I adapted it for this project.

The playbook works in layers. First, I wrote a product spec with features, acceptance criteria, UX requirements, and scope boundaries. Clear enough that an AI agent could read it and implement without ambiguity. Then I fed that spec to Claude and collaborated on a technical strategy covering stack selection, architecture, and key decisions, each with explicit tradeoffs documented. Finally, both documents fed into a sequenced implementation plan: 13 discrete phases with dependency ordering and parallelization notes.

Three documents. Each answers exactly one question: what are we building, why this technical approach, and in what order.

## The System

The documents are half the picture. The other half is an execution pipeline.

I configured six specialized AI agents, each scoped to one responsibility: builder, test writer, code reviewer, doc verifier, documentation writer, and refactor scout. These are defined agents with specific tool access, constraints, and output contracts.

An orchestration layer called `/implement` ties them together. You invoke it with a task description and it runs the full pipeline: build, conditionally test, code review (producing a written report), fix flagged issues, verify documentation accuracy, then finalize. A compound engineering protocol runs at the end of every session, documenting new patterns and anti-patterns so each phase leaves the codebase smarter for the next one.

A quality gate enforces that every pipeline phase completes before a session can end. You can't skip the code review. You can't skip doc verification.

## The Build

Execution was one focused day. Each of the 13 phases mapped to a single `/implement` session: project scaffold, data layer, app shell, API proxy, single-provider streaming, tri-model streaming, settings, cross-feed, conversation management, token tracking, export, PWA polish, deployment.

Some phases ran in parallel across multiple Claude Code sessions. The proxy and data layer are independent, for example, so they built simultaneously. The implementation plan explicitly marked which phases could parallelize.

The result: a fully functional workspace running React 19, TypeScript, Tailwind CSS, Vercel AI SDK for streaming, Dexie.js for local persistence, and Cloudflare Workers as a stateless CORS proxy. 405 tests passing. Deployed and in daily use.

## What I Actually Did

I want to be precise about the division of labor. I didn't write the application code. The agents did. What I did:

- Defined product requirements with enough precision that implementation was unambiguous
- Made architectural decisions and documented the reasoning
- Designed the agent system and orchestration pipeline
- Sequenced work so each phase had clear inputs and exit criteria
- Reviewed outputs and course-corrected when something was off

This is product engineering in a literal sense. Defining the product and designing the engineering system are the same work. You're building a machine that produces software, and the quality of its output follows directly from the quality of your inputs.

## Why This Matters

The cost of building custom software is collapsing. For a growing category of projects, one person with a well-structured playbook and AI agents can ship in a day what used to take a team weeks. That changes the calculus on what's worth building. Niche tools that no company would greenlight become viable when build costs approach zero.

The playbook I used here is project-agnostic. The artifact structure, the agent pipeline, the compound engineering protocol all transfer to the next project. What compounds across projects is the system, not any individual codebase.

If you're in product or technical program management and you're not yet thinking about how AI changes your role, the shift is already underway. The work is moving from coordinating people and timelines to designing systems that make AI agents effective. Spec clarity, decision documentation, automated quality gates. These have always mattered, but now they're the primary lever, because your "team" includes agents that do exactly what you tell them and nothing more.
