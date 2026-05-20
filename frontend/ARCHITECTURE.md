# Frontend Architecture - Multi-Tenant RAG Chatbot SaaS

This document summarizes the complete frontend architecture for the multi-tenant RAG chatbot SaaS platform.

## Directory Structure Overview

```
frontend/src/
├── app/                           # Next.js 14 App Router
│   ├── (public)/                  # Public routes (no auth required)
│   │   ├── page.tsx               # Landing page (enhanced)
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   │
│   ├── (auth)/                    # Protected routes (auth required)
│   │   ├── layout.tsx             # Auth wrapper
│   │   ├── dashboard/page.tsx     # Chatbot list & management
│   │   ├── account/
│   │   │   ├── page.tsx           # Account settings
│   │   │   ├── billing/page.tsx
│   │   │   └── api-keys/page.tsx
│   │   │
│   │   └── chatbot/[chatbotId]/   # Per-chatbot workspace
│   │       ├── layout.tsx         # Workspace layout with sidebar
│   │       ├── page.tsx           # Redirects to analytics
│   │       ├── analytics/page.tsx # Analytics dashboard (PRIORITY)
│   │       ├── knowledge-base/page.tsx
│   │       ├── qa-management/page.tsx
│   │       ├── customization/page.tsx
│   │       ├── settings/page.tsx
│   │       ├── playground/page.tsx
│   │       ├── embed/page.tsx
│   │       └── conversations/page.tsx
│   │
│   ├── chat/page.tsx              # Legacy chat page
│   ├── agents/page.tsx            # Legacy agents page
│   ├── api/                       # API routes
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── ui/                        # Shadcn/ui base components
│   ├── layout/                    # Layout components
│   │   ├── Sidebar.tsx            # Workspace sidebar
│   │   └── Header.tsx             # Top navigation header
│   ├── analytics/                 # Analytics components (PRIORITY)
│   │   ├── MetricCard.tsx
│   │   ├── MetricsGrid.tsx
│   │   ├── ConversationChart.tsx
│   │   ├── TopQueriesList.tsx
│   │   ├── SatisfactionChart.tsx
│   │   ├── AgentStats.tsx
│   │   ├── KnowledgeUsage.tsx
│   │   ├── DateRangePicker.tsx
│   │   └── ExportButton.tsx
│   ├── dashboard/
│   │   ├── ChatbotCard.tsx
│   │   └── CreateChatbotModal.tsx
│   ├── shared/
│   │   ├── GlassCard.tsx
│   │   └── StatusBadge.tsx
│   └── [chat/, documents/, agents/]
│
├── hooks/
│   ├── useAnalytics.ts            # Analytics data fetching
│   ├── useAuth.ts                 # Authentication state
│   ├── useChatbots.ts             # Chatbot CRUD operations
│   └── [useChat.ts, useWebSocket.ts]
│
├── lib/
│   ├── api/
│   │   ├── client.ts              # Axios instance with interceptors
│   │   ├── chatbots.ts            # Chatbot API methods
│   │   └── auth.ts                # Auth API methods
│   └── utils/
│       ├── constants.ts           # Design system constants
│       └── formatters.ts          # Date/number formatters
│
├── stores/
│   └── authStore.ts               # Zustand auth state
│
└── types/
    ├── auth.ts
    ├── chatbot.ts
    └── analytics.ts
```

## Design System

### Color Palette (3 colors)
- **Primary**: `#5B5EFF` (Indigo)
- **Secondary**: `#4ECDC4` (Teal)
- **Accent**: `#FF6B6B` (Coral)

### Neutrals
- Background: `#F5F5F7`
- Surface: `#FFFFFF`
- Text Primary: `#1D1D1F`
- Text Secondary: `#86868B`

### Glassmorphism
- Background: `rgba(255, 255, 255, 0.7)`
- Blur: `20px`
- Border: `rgba(255, 255, 255, 0.2)`

## Key Components

### Analytics Page Components

1. **MetricsGrid**: Displays 6 key metrics in cards
   - Total Conversations
   - Total Messages
   - Avg Response Time
   - User Satisfaction
   - Resolution Rate
   - Active Users

2. **ConversationChart**: SVG-based area chart showing trends

3. **TopQueriesList**: Ranked list of most asked questions

4. **SatisfactionChart**: Donut chart with user feedback breakdown

5. **AgentStats**: Agent execution performance metrics

6. **KnowledgeUsage**: Knowledge base source usage

### Layout Components

1. **Sidebar**: Collapsible workspace navigation
2. **Header**: User menu, breadcrumbs, notifications

## State Management

- **Zustand** for client state
- **React Query** (optional) for server state caching
- **URL state** for filters and pagination

## API Integration

All API calls go through the centralized API client with:
- Automatic token refresh
- Request/response interceptors
- Error handling
- Loading states

## Getting Started

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Access the application:
- Landing: http://localhost:3000
- Dashboard: http://localhost:3000/dashboard
- Analytics: http://localhost:3000/chatbot/[id]/analytics

## Next Steps

1. Connect to real backend API endpoints
2. Implement authentication flow
3. Add remaining workspace pages (Knowledge Base, Q&A, etc.)
4. Add dark mode toggle
5. Implement real-time WebSocket updates
6. Add unit and integration tests
