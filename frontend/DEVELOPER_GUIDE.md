# Frontend Developer Quick Reference

## Quick Start Commands

### Development
```bash
cd frontend
npm install          # Install dependencies
npm run dev         # Start dev server (http://localhost:3000)
npm run build       # Build for production
npm run start       # Start production server
npm run lint        # Run ESLint
```

### Docker
```bash
docker-compose up --build              # Build and start all services
docker-compose up -d frontend          # Start only frontend
docker-compose logs -f frontend        # View frontend logs
docker-compose restart frontend        # Restart frontend
docker-compose down                    # Stop all services
```

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout (fonts, metadata)
│   │   ├── page.tsx            # Home page (/, landing)
│   │   ├── globals.css         # Global styles + Tailwind
│   │   ├── chat/               # Chat page (/chat)
│   │   │   └── page.tsx        # Main chat interface
│   │   └── agents/             # Agents page (/agents)
│   │       └── page.tsx        # Agent visualization
│   │
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   │   ├── button.tsx      # Button component
│   │   │   ├── card.tsx        # Card component
│   │   │   ├── input.tsx       # Input component
│   │   │   └── scroll-area.tsx # Scrollable container
│   │   │
│   │   ├── chat/               # Chat-specific components
│   │   │   ├── MessageList.tsx # Message display with auto-scroll
│   │   │   ├── MessageBubble.tsx # Individual message styling
│   │   │   ├── ChatInput.tsx   # Input field with send button
│   │   │   ├── SourceCitation.tsx # Document/web sources display
│   │   │   └── AgentExecutionCard.tsx # Agent execution status
│   │   │
│   │   ├── agents/             # Agent visualization
│   │   │   ├── AgentList.tsx   # List of available agents
│   │   │   └── WorkflowGraph.tsx # Visual workflow display
│   │   │
│   │   └── documents/          # Document handling
│   │       └── DocumentUpload.tsx # File upload component
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useChat.ts          # Chat state + WebSocket logic
│   │   └── useWebSocket.ts     # WebSocket connection management
│   │
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   │
│   └── lib/
│       └── utils.ts            # Utility functions (cn, etc.)
│
├── public/                     # Static assets
├── .dockerignore              # Docker build exclusions
├── .env.example               # Environment variables template
├── Dockerfile                 # Container build instructions
├── next.config.mjs            # Next.js configuration
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript configuration
├── tailwind.config.ts         # Tailwind CSS configuration
└── README.md                  # Detailed documentation
```

## Key Files to Understand

### Configuration Files
- **next.config.mjs** - Next.js config (API rewrites, env vars)
- **tailwind.config.ts** - Design system (colors, spacing)
- **tsconfig.json** - TypeScript settings (paths, strict mode)
- **package.json** - Dependencies and scripts

### Core Logic Files
- **src/hooks/useChat.ts** - Main chat logic, WebSocket integration
- **src/hooks/useWebSocket.ts** - WebSocket connection management
- **src/types/index.ts** - All TypeScript interfaces

### UI Files
- **src/app/layout.tsx** - Root layout with fonts
- **src/app/chat/page.tsx** - Main chat interface
- **src/components/chat/MessageList.tsx** - Message display

## Environment Variables

### Required
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### Docker (auto-set in docker-compose.yml)
```bash
NEXT_PUBLIC_API_URL=http://backend:8000
NEXT_PUBLIC_WS_URL=ws://backend:8000
```

## Common Tasks

### Add New UI Component
```bash
# Create component file
touch src/components/ui/my-component.tsx

# Follow shadcn/ui pattern:
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface MyComponentProps {
  // Define props
}

export function MyComponent({ props }: MyComponentProps) {
  return (
    <div className={cn("base-styles", "variant-styles")}>
      {/* Component content */}
    </div>
  );
}
```

### Add New Page
```bash
# Create page directory and file
mkdir src/app/my-page
touch src/app/my-page/page.tsx

# Basic page structure:
export default function MyPage() {
  return (
    <div>
      {/* Page content */}
    </div>
  );
}
```

### Update WebSocket Message Type
```typescript
// Edit src/types/index.ts
export interface MyMessage extends WSMessage {
  type: 'my_message_type';
  data: {
    // Define data structure
  };
}

// Use in hooks
onMessage: (message) => {
  if (message.type === 'my_message_type') {
    const data = (message as MyMessage).data;
    // Handle message
  }
}
```

## Debugging

### Check WebSocket Connection
```javascript
// In browser console
const ws = new WebSocket('ws://localhost:8000/chat/ws?session_id=test');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Message:', JSON.parse(e.data));
```

### View React State
```javascript
// In browser console (if React DevTools installed)
// Or add console.log in components
```

### Check Environment Variables
```javascript
// In browser console
console.log(process.env.NEXT_PUBLIC_API_URL);
console.log(process.env.NEXT_PUBLIC_WS_URL);
```

## Design System

### Colors
```css
/* Primary color (blue) */
text-primary: hsl(var(--primary))
bg-primary: hsl(var(--primary))
border-primary: hsl(var(--primary))

/* Muted (gray) */
text-muted-foreground: hsl(var(--muted-foreground))
bg-muted: hsl(var(--muted))

/* Destructive (red) */
text-destructive: hsl(var(--destructive))
bg-destructive: hsl(var(--destructive))
```

### Typography
```jsx
<h1 className="text-4xl font-bold">Heading 1</h1>
<h2 className="text-3xl font-semibold">Heading 2</h2>
<p className="text-base text-muted-foreground">Body text</p>
<small className="text-sm text-muted-foreground">Small text</small>
```

### Spacing
```jsx
// Tailwind spacing scale (0.25rem increments)
<div className="p-4">    <!-- padding: 1rem -->
<div className="px-4">   <!-- padding-x: 1rem -->
<div className="gap-4">  <!-- gap: 1rem -->
<div className="space-y-4">  <!-- vertical gap between children -->
```

## WebSocket Message Flow

### Sending a Message
```typescript
// In useChat.ts
sendMessage(userMessage) → sendWsMessage({
  type: 'chat_message',
  session_id: sessionId,
  message: content
})
```

### Receiving Responses
```typescript
// Server → Client flow:
1. agent_update: Agent starts processing
2. chat_chunk: Streaming text response
3. chat_complete: Final response with sources
4. error: If something went wrong
```

## Common Issues & Solutions

### WebSocket Not Connecting
- **Check**: Backend is running
- **Check**: Correct WebSocket URL
- **Fix**: Update NEXT_PUBLIC_WS_URL in .env

### Docker Build Fails
- **Check**: All files are copied in Dockerfile
- **Fix**: Delete node_modules and rebuild
- **Command**: `docker-compose build --no-cache`

### TypeScript Errors
- **Check**: Types are defined in src/types/index.ts
- **Fix**: Add proper type definitions
- **Command**: `npm run lint` to check all errors

### Styling Not Applied
- **Check**: Tailwind directives in globals.css
- **Check**: Component uses 'use client' if needed
- **Fix**: Restart dev server

## Performance Tips

### Optimize Components
```typescript
// Use React.memo for expensive renders
export const MyComponent = React.memo(({ props }) => {
  // Component logic
});

// Use useCallback for event handlers
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

### Code Splitting
```typescript
// Dynamic imports for heavy components
const WorkflowGraph = dynamic(
  () => import('@/components/agents/WorkflowGraph'),
  { ssr: false }
);
```

### Image Optimization
```jsx
import Image from 'next/image';

<Image
  src="/path/to/image.png"
  alt="Description"
  width={500}
  height={300}
  loading="lazy"
/>
```

## Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Radix UI**: https://www.radix-ui.com/docs/primitives
- **shadcn/ui**: https://ui.shadcn.com
- **WebSocket MDN**: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket

## Getting Help

1. Check `frontend/README.md` for detailed docs
2. Review `MIGRATION_GUIDE.md` for architecture decisions
3. Check Docker logs: `docker-compose logs frontend`
4. Open browser DevTools and check Console/Network tabs
5. Verify backend is running: `curl http://localhost:8000/health`
