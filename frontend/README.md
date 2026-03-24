# RAG Chatbot Frontend - Next.js 14

## Overview
This is the active frontend implementation using Next.js 14 with App Router, TypeScript, and Tailwind CSS.

## Architecture

### Tech Stack
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling with custom design system
- **Zustand** - State management (lightweight)
- **Radix UI** - Accessible UI components
- **Axios** - HTTP client
- **Lucide React** - Icon library
- **React Markdown** - Markdown rendering

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── chat/              # Chat page
│   └── agents/            # Agents visualization page
├── components/
│   ├── ui/                # Reusable UI components (shadcn/ui style)
│   ├── chat/              # Chat-specific components
│   ├── agents/            # Agent visualization components
│   └── documents/         # Document upload components
├── hooks/
│   ├── useChat.ts         # Chat state and WebSocket logic
│   └── useWebSocket.ts    # WebSocket connection management
├── types/
│   └── index.ts           # TypeScript type definitions
└── lib/
    └── utils.ts           # Utility functions (cn, etc.)
```

## Environment Variables

### Required Environment Variables
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000     # Backend API URL
NEXT_PUBLIC_WS_URL=ws://localhost:8000        # WebSocket URL
```

### Docker Environment Variables
When running with Docker Compose, these are automatically set:
```bash
NEXT_PUBLIC_API_URL=http://backend:8000
NEXT_PUBLIC_WS_URL=ws://backend:8000
```

## Key Features

### 1. WebSocket Integration
- Real-time streaming responses
- Agent execution updates
- Automatic reconnection handling
- Fallback to HTTP when WebSocket unavailable

### 2. Multi-Agent Visualization
- Real-time agent status updates
- Workflow graph visualization
- Execution timeline tracking

### 3. Document Upload
- Drag-and-drop file upload
- Progress tracking
- Multiple file format support

### 4. Responsive Design
- Mobile-first approach
- Touch-friendly interfaces
- Optimized for all screen sizes

## Development

### Local Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

### Docker Development
```bash
# Build and start all services
docker-compose up --build

# View logs
docker-compose logs -f frontend

# Restart frontend
docker-compose restart frontend
```

## Design System

### Color Palette
The application uses a professional, minimal color scheme with CSS custom properties:
- **Primary**: Deep Blue (`221.2 83.2% 53.3%`)
- **Secondary**: Light Gray (`210 40% 96.1%`)
- **Accent**: Muted Blue (`210 40% 96.1%`)
- **Destructive**: Red (`0 84.2% 60.2%`)

### Typography
- **Font**: Inter (Google Fonts)
- **Hierarchy**: Clear heading levels with semantic HTML
- **Readability**: Optimized line heights and spacing

### Components
All UI components follow the shadcn/ui pattern:
- Fully typed with TypeScript
- Accessible (ARIA compliant)
- Customizable via variants
- Composable and reusable

## WebSocket Protocol

### Client Messages
```typescript
{
  type: 'chat_message',
  session_id: string,
  message: string
}
```

### Server Messages
```typescript
// Agent update
{
  type: 'agent_update',
  data: {
    agent_id: string,
    agent_name: string,
    status: 'running' | 'completed' | 'failed',
    output_data?: Record<string, unknown>
  }
}

// Chat chunk (streaming)
{
  type: 'chat_chunk',
  data: {
    chunk: string
  }
}

// Chat complete
{
  type: 'chat_complete',
  data: {
    response: string,
    sources: Source[],
    agent_executions: AgentExecution[]
  }
}

// Error
{
  type: 'error',
  data: {
    message: string,
    details?: string
  }
}
```

## Security Considerations

### Environment Variables
- Never expose sensitive data in client-side code
- Use `NEXT_PUBLIC_` prefix only for non-sensitive public URLs
- API keys should never be stored in frontend

### WebSocket Security
- Validate all incoming messages
- Handle connection errors gracefully
- Implement rate limiting on the backend
- Use secure WebSocket (wss://) in production

### Content Security
- Sanitize all user inputs
- Use React's built-in XSS protection
- Implement Content Security Policy headers
- Validate file uploads on backend

## Performance Optimization

### Code Splitting
- Automatic route-based splitting
- Dynamic imports for heavy components
- Lazy loading for agent visualizations

### Bundle Optimization
- Tree shaking for unused code
- Optimized package imports
- Minimized production builds

### Runtime Optimization
- React.memo for expensive components
- useCallback/useMemo for expensive computations
- Virtual scrolling for long lists (when needed)

## Troubleshooting

### WebSocket Connection Issues
- Check if backend is running
- Verify WebSocket URL in environment variables
- Check browser console for errors
- Verify Docker networking (use service names, not localhost)

### Build Failures
- Clear `.next` directory: `rm -rf .next`
- Clear node_modules: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run lint`
- Verify environment variables are set

### Docker Issues
- Check Docker logs: `docker-compose logs frontend`
- Verify network connectivity: `docker network ls`
- Rebuild without cache: `docker-compose build --no-cache`
- Check environment variables in docker-compose.yml

## Migration from Legacy React App

The frontend has been restructured to use Next.js 14 at the root level. The legacy Create React App code has been removed.

### Key Differences
1. **Routing**: Next.js App Router vs React Router
2. **Build**: Next.js optimizations vs Create React App
3. **API**: Built-in API routes vs separate backend
4. **Styling**: Tailwind CSS vs CSS modules

## Future Improvements

- [ ] Add WebSocket connection status indicator
- [ ] Implement offline mode with service workers
- [ ] Add message search functionality
- [ ] Implement theme switching (light/dark)
- [ ] Add export chat history feature
- [ ] Optimize bundle size further
- [ ] Add end-to-end testing
- [ ] Implement analytics tracking
