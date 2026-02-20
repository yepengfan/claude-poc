# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 16 full-stack chatbot application using the Anthropic SDK for streaming AI conversations. React 19 frontend with a server-side API route that streams Claude responses via ReadableStream.

## Commands

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run lint         # Run ESLint
npm test             # Run all Jest tests
npm test -- --watch  # Watch mode
npm test -- path/to/file.test.ts  # Run a single test file
```

## Architecture

**Data flow:** User input → Client component → POST `/api/chat` with message history → Anthropic SDK streaming call → ReadableStream chunks back to client → Real-time UI update via react-markdown.

- `src/app/page.tsx` — Client component ("use client") managing chat state, input handling, and streaming response assembly
- `src/app/api/chat/route.ts` — Server-side POST handler using Anthropic SDK with streaming (`content_block_delta` events piped through ReadableStream)
- `src/app/api/chat/model.ts` — Shared constants (`CHAT_MODEL`, `MAX_TOKENS`) used by both route and tests

## Testing

Tests are colocated in `__tests__/` directories next to source files. Two test environments:

- **UI tests** (`src/app/__tests__/page.test.tsx`) — jsdom environment, mocks `fetch` with streaming response simulation, mocks `react-markdown` (ESM-only workaround)
- **API tests** (`src/app/api/chat/__tests__/route.test.ts`) — Node environment (`@jest-environment node` pragma), mocks Anthropic SDK

`jest.setup.ts` polyfills `TextEncoder`/`TextDecoder` for jsdom.

## Key Dependencies

- `@anthropic-ai/sdk` — Direct SDK integration (no abstraction layer)
- `react-markdown` + `@tailwindcss/typography` — Markdown rendering with prose styling
- Tailwind CSS v4 via `@tailwindcss/postcss` plugin
- TypeScript strict mode with `@/*` path alias → `./src/*`

## Claude Code Hooks

- **PreToolUse:** Blocks access to `.env` and credential files (`block-credentials.js`)
- **PostToolUse:** Runs TypeScript type checking on Write/Edit operations (`check-typescript.js`)


# AI-Assisted Spec-Driven Development

AI tool agnostic Spec Driven Development implementation

## Project Context

### Paths
- Steering: `.sdd/steering/`
- Specs: `.sdd/specs/`

### Steering vs Specification

**Steering** (`.sdd/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.sdd/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.sdd/specs/` for active specifications
- Use `/sdd:spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, generate responses in English. All Markdown content written to project files (e.g., requirements.md, design.md, tasks.md, research.md, validation reports) MUST be written in the target language configured for this specification (see spec.json.language).

## Minimal Workflow
- Phase 0 (optional): `/sdd:steering`, `/sdd:steering-custom`
- Phase 1 (Specification):
  - `/sdd:spec-init "description"`
  - `/sdd:spec-requirements {feature}`
  - `/sdd:validate-gap {feature}` (optional: for existing codebase)
  - `/sdd:spec-design {feature} [-y]`
  - `/sdd:validate-design {feature}` (optional: design review)
  - `/sdd:spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/sdd:spec-impl {feature} [tasks]`
  - `/sdd:validate-impl {feature}` (optional: after implementation)
- Progress check: `/sdd:spec-status {feature}` (use anytime)

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/sdd:spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration
- Load entire `.sdd/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `/sdd:steering-custom`)
