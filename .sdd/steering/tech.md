# Technology Stack

## Architecture

Server-rendered Next.js application with a single client component and a streaming API route. No database, no auth — stateless request/response with conversation state held client-side.

## Core Technologies

- **Language**: TypeScript (strict mode, no `any`)
- **Framework**: Next.js 16 (App Router)
- **Runtime**: Node.js with React 19
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss`

## Key Libraries

- `@anthropic-ai/sdk` — Direct SDK integration, no wrapper or abstraction layer
- `react-markdown` + `@tailwindcss/typography` — Markdown rendering with prose styling

## Development Standards

### Type Safety
TypeScript strict mode enabled. Path alias `@/*` maps to `./src/*`.

### Code Quality
ESLint with `eslint-config-next`. PostToolUse hook runs `tsc --noEmit` on file changes.

### Testing
Jest with two environments:
- **jsdom** for UI component tests (mocked fetch, mocked ESM-only packages)
- **node** for API route tests (mocked Anthropic SDK)

Tests colocated in `__tests__/` directories next to source files.

## Development Environment

### Common Commands
```bash
npm run dev          # Dev server at localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm test             # All Jest tests
```

## Key Technical Decisions

- **No abstraction over Anthropic SDK**: Direct SDK calls in API route for simplicity
- **Client-side conversation state**: Messages array managed in React state, no server persistence
- **ReadableStream for streaming**: Manual stream construction from `content_block_delta` events
- **Shared model constants**: `model.ts` exports `CHAT_MODEL` and `MAX_TOKENS` for route and tests

---
_Document standards and patterns, not every dependency_
