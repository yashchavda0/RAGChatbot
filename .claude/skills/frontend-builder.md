---
name: frontend-builder
description: Build and manage frontend components, pages, and features
---

Build frontend features for the RAG chatbot.

## Usage
```
/frontend-builder <action> [options]
```

## Actions
- `component`: Create React component
- `page`: Create Next.js page
- `hook`: Create custom hook
- `feature`: Create complete feature (component + hook + types)
- `layout`: Create layout component

## Tech Stack
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Zustand (state)
- shadcn/ui components

## Project Structure
```
frontend/src/
├── app/           # Pages
├── components/    # React components
│   ├── ui/        # Base components
│   ├── chat/      # Chat components
│   ├── agents/    # Agent visualization
│   └── documents/ # Document handling
├── hooks/         # Custom hooks
├── lib/           # Utilities
└── types/         # TypeScript types
```

## Examples
```
/frontend-builder component SearchBar --type ui
/frontend-builder feature ChatHistory
/frontend-builder page analytics --layout dashboard
```
