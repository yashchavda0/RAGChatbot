---
name: project-conventions
description: Apply project-specific code style and conventions
user-invocable: false
---

Apply project-specific coding conventions automatically.

## Backend Conventions

### Python Style
- Use `async/await` for all I/O operations
- Singleton pattern for services
- `@register_agent` decorator for all agents
- Pydantic v2 models with `ConfigDict`

### Naming
- Services: `<Name>Service` (e.g., `GeminiService`)
- Agents: `<Name>Agent` (e.g., `DocumentSearchAgent`)
- Routes: snake_case files, PascalCase classes

### File Structure
```
backend/
├── agents/      # LangGraph agents
├── services/    # Business logic
├── api/         # FastAPI routes
├── graph/       # StateGraph definitions
└── config/      # Settings and logging
```

## Frontend Conventions

### TypeScript Style
- Functional components with hooks
- `cn()` utility for conditional classes
- Props interface above component

### Naming
- Components: PascalCase (e.g., `MessageBubble`)
- Hooks: camelCase with `use` prefix (e.g., `useChat`)
- Files: PascalCase for components

### File Structure
```
frontend/src/
├── app/         # Next.js pages
├── components/  # React components
├── hooks/       # Custom hooks
├── lib/         # Utilities
└── types/       # TypeScript types
```

## Common Patterns
- Error handling: Try/catch with logging
- State updates: Immutable patterns
- API calls: Axios with error handling
