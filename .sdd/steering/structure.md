# Project Structure

## Organization Philosophy

Next.js App Router conventions with colocated tests. Flat structure — the app is small enough that feature directories aren't needed. API routes live under `src/app/api/`.

## Directory Patterns

### Pages
**Location**: `src/app/`
**Purpose**: Route-level components (App Router file conventions)
**Example**: `page.tsx` is the single-page chat UI, `layout.tsx` provides root HTML shell

### API Routes
**Location**: `src/app/api/<domain>/`
**Purpose**: Server-side request handlers
**Example**: `api/chat/route.ts` handles POST with streaming response

### Shared Constants
**Location**: Colocated with the route that owns them
**Purpose**: Shared values used by both implementation and tests
**Example**: `api/chat/model.ts` exports `CHAT_MODEL`, `MAX_TOKENS`

### Tests
**Location**: `__tests__/` directory adjacent to source files
**Purpose**: Colocated unit/integration tests
**Example**: `src/app/__tests__/page.test.tsx`, `src/app/api/chat/__tests__/route.test.ts`

## Naming Conventions

- **Files**: kebab-case for non-component files (`model.ts`, `route.ts`), Next.js conventions for routes (`page.tsx`, `layout.tsx`)
- **Components**: PascalCase function names (`Home`, `RootLayout`)
- **Test files**: `<source-name>.test.ts(x)`

## Import Organization

```typescript
// React/framework imports first
import { useState, useRef, useEffect } from "react";
// Third-party libraries
import ReactMarkdown from "react-markdown";
// Local/relative imports
import { CHAT_MODEL, MAX_TOKENS } from "./model";
```

**Path Aliases**:
- `@/*` maps to `./src/*`

## Code Organization Principles

- Single page app — one client component owns all chat UI state
- API route is a pure function: receives messages, returns stream
- No shared state between client and server beyond the HTTP request

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
