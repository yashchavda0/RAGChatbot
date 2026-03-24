---
name: project_frontend_restructure
description: Frontend architecture restructure completed March 2026 - Next.js 14 now at frontend/ root
type: project
---

# Frontend Restructure - March 2026

## Project Structure Change

**Completed**: March 19, 2026

### What Changed

The frontend architecture was restructured from a dual-setup (legacy React CRA + Next.js in subdirectory) to a unified Next.js 14 application.

**Previous Structure:**
- `frontend/src/` - Legacy Create React App (deprecated)
- `frontend/next/` - Next.js 14 app (active)
- `frontend/package.json` - CRA dependencies

**Current Structure:**
- `frontend/` - Next.js 14 app at root level
- `frontend/src/` - Next.js App Router source code
- `frontend/package.json` - Next.js dependencies

### Key Locations

**Frontend Root:** `D:/Techs/Project/rag-chatbot/frontend/`

**Source Code:** `frontend/src/`
- `app/` - Next.js App Router pages
- `components/` - React components (chat, agents, documents, ui)
- `hooks/` - Custom hooks (useChat, useWebSocket)
- `lib/` - Utilities (utils.ts)
- `types/` - TypeScript type definitions

**Configuration Files:**
- `Dockerfile` - Container build configuration
- `package.json` - Next.js 14 dependencies
- `next.config.mjs` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS setup
- `tsconfig.json` - TypeScript configuration

**Docker Reference:** `docker-compose.yml` build context is now `./frontend` (not `./frontend/next`)

### Why This Change

**Reason:** The dual structure was confusing and non-standard. Having Next.js in a `next/` subdirectory while legacy CRA code was at the root violated project conventions and made the codebase harder to maintain.

**How to Apply:**
- All new frontend work should be done in `frontend/`
- Reference Next.js App Router pages in `frontend/src/app/`
- Use `frontend/` as the build context for Docker operations
- No references to `frontend/next/` should exist in code or documentation

### Tech Stack

- **Framework:** Next.js 14 with App Router
- **UI Library:** Radix UI components
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **HTTP Client:** Axios
- **Icons:** Lucide React
- **Runtime:** Node.js 20 (Alpine in Docker)

### Development Commands

```bash
# Local development
cd frontend
npm install
npm run dev

# Docker development
docker-compose up --build frontend

# Production build
cd frontend
npm run build
npm run start
```

### Design Tokens

**Color Palette:**
- Primary: Deep Navy (via Tailwind config)
- Accent: Emerald Green (via Tailwind config)
- Neutral: Gray scale (via Tailwind defaults)

**Component Patterns:**
- UI components in `src/components/ui/`
- Feature-specific components in `src/components/{feature}/`
- Custom hooks in `src/hooks/`
- Utility functions in `src/lib/`

### Security Notes

- API URLs configured via `NEXT_PUBLIC_API_URL` environment variable
- WebSocket URLs configured via `NEXT_PUBLIC_WS_URL` environment variable
- No sensitive data in client-side code
- Environment variables documented in `frontend/.env.example`
