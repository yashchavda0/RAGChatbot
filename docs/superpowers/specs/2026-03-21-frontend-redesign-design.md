# Frontend Redesign Specification

**Date:** 2026-03-21
**Status:** Approved
**Theme:** Midnight Sapphire

---

## Overview

Complete frontend redesign for the RAG Chatbot application, transforming the current generic shadcn/ui appearance into a distinctive, modern interface with a cohesive design system built around 2-3 rich colors.

---

## Design Direction

### Color Palette: Midnight Sapphire

| Name | Hex | HSL | Usage |
|------|-----|-----|-------|
| **Deep Navy** | `#0f172a` | `222 47% 11%` | Primary background, sidebar |
| **Slate Dark** | `#020617` | `240 100% 3%` | Header, elevated surfaces |
| **Electric Blue** | `#3b82f6` | `217 91% 60%` | Primary actions, links, focus rings |
| **Cyan** | `#06b6d4` | `187 92% 43%` | Accents, active states, gradients |
| **Slate 800** | `#1e293b` | `217 33% 17%` | Cards, input backgrounds |
| **Slate 400** | `#94a3b8` | `215 16% 65%` | Muted text, secondary elements |
| **Slate 100** | `#f1f5f9` | `210 40% 96%` | Primary text on dark |

### Gradient Accents

```css
/* Primary gradient - buttons, user messages */
--gradient-primary: linear-gradient(135deg, #3b82f6, #06b6d4);

/* Subtle gradient - backgrounds, cards */
--gradient-subtle: linear-gradient(180deg, #0f172a, #020617);
```

---

## Layout Architecture

### Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Header (fixed, backdrop blur)                              │
│  Logo | Nav | Actions                                        │
├──────────┬────────────────────────────────┬─────────────────┤
│ Sidebar  │        Main Chat Area          │  Agent Panel    │
│ (200px)  │        (fluid)                 │  (180px)        │
│          │                                │  (collapsible)  │
│ Sessions │  ┌──────────────────────────┐  │                 │
│ History  │  │ Message Bubbles          │  │ Agent Status    │
│          │  │ (centered, max-width)    │  │ Cards           │
│ Quick    │  │                          │  │                 │
│ Actions  │  └──────────────────────────┘  │ Real-time       │
│          │                                │ Updates         │
│          │  ┌──────────────────────────┐  │                 │
│          │  │ Chat Input               │  │                 │
│          │  │ (rounded, gradient btn)  │  │                 │
│          │  └──────────────────────────┘  │                 │
├──────────┴────────────────────────────────┴─────────────────┤
│  Footer (minimal)                                           │
└─────────────────────────────────────────────────────────────┘
```

### Responsive Breakpoints

| Breakpoint | Sidebar | Agent Panel | Layout |
|------------|---------|-------------|--------|
| Mobile (<768px) | Hidden (hamburger) | Hidden | Single column |
| Tablet (768-1024px) | Collapsed (icons) | Hidden | Two column |
| Desktop (>1024px) | Expanded (200px) | Visible (180px) | Three column |

---

## Component Specifications

### 1. Header

- **Background:** `#020617` with subtle border
- **Logo:** Gradient square with "R" lettermark
- **Nav items:** Ghost buttons with hover state
- **Active state:** Primary button style

### 2. Sidebar

```tsx
// Session item styles
- Background (active): #1e293b
- Background (hover): rgba(30, 41, 59, 0.5)
- Border radius: 6px
- Padding: 8px
- Title: #e2e8f0, 12px
- Timestamp: #64748b, 10px
```

### 3. Message Bubbles

**User Messages:**
- Background: `linear-gradient(135deg, #3b82f6, #06b6d4)`
- Text: White
- Border radius: 12px (bottom-right: 4px)
- Max width: 70%

**AI Messages:**
- Background: `#1e293b`
- Text: `#f1f5f9`
- Border radius: 12px (bottom-left: 4px)
- Avatar: Subtle pulsing animation when processing

### 4. Chat Input

```tsx
// Container
- Background: #1e293b
- Border radius: 24px
- Padding: 6px 12px

// Input
- Background: transparent
- Text: #f1f5f9
- Placeholder: #64748b

// Send button
- Background: linear-gradient(135deg, #3b82f6, #06b6d4)
- Border radius: 50%
- Icon: white
- Hover: scale(1.05)
```

### 5. Agent Panel

```tsx
// Agent card states
- Running: border-left 2px #3b82f6, pulsing dot
- Complete: border-left 2px #06b6d4, checkmark
- Waiting: border-left 2px #334155, empty dot

// Animation
- Fade in on status change
- Subtle pulse on "Running" state
```

### 6. Cards (Feature cards, Agent cards)

```tsx
- Background: #1e293b
- Border: 1px solid rgba(148, 163, 184, 0.1)
- Border radius: 12px
- Hover: box-shadow + subtle lift
- Padding: 16px
```

---

## Interactivity & Animations

### Level: Polished

| Element | Animation | Duration |
|---------|-----------|----------|
| Message appear | Fade in + slide up | 300ms |
| Typing indicator | Bounce dots | 1.4s loop |
| Button hover | Scale + glow | 150ms |
| Card hover | Lift + shadow | 200ms |
| Agent status | Fade + pulse | 500ms |
| Sidebar toggle | Slide | 250ms |

### Loading States

- **Skeleton screens** for content loading
- **Shimmer effect** on skeletons
- **Progressive loading** for messages

### Micro-interactions

- Input focus: subtle glow ring
- Send button: scale on click
- Session hover: background fade
- Agent running: pulsing indicator

---

## Pages to Update

### 1. Home Page (`/`)

- Dark hero section with gradient text
- Feature cards with hover effects
- Tech stack badges (minimal)
- CTA buttons with gradient

### 2. Chat Page (`/chat`)

- Full sidebar implementation
- Message area with new bubble styles
- Agent panel (collapsible)
- Updated input component

### 3. Agents Page (`/agents`)

- Card grid with updated styling
- Workflow graph with themed colors
- Agent detail panel

---

## CSS Variables Update

```css
:root {
  /* Midnight Sapphire Theme */
  --background: 222 47% 11%;      /* #0f172a */
  --foreground: 210 40% 96%;      /* #f1f5f9 */

  --card: 217 33% 17%;            /* #1e293b */
  --card-foreground: 210 40% 96%;

  --primary: 217 91% 60%;         /* #3b82f6 */
  --primary-foreground: 0 0% 100%;

  --secondary: 187 92% 43%;       /* #06b6d4 */
  --secondary-foreground: 0 0% 100%;

  --muted: 215 16% 65%;           /* #94a3b8 */
  --muted-foreground: 215 20% 65%;

  --accent: 187 92% 43%;          /* #06b6d4 */
  --accent-foreground: 0 0% 100%;

  --border: 217 33% 17%;
  --input: 217 33% 17%;
  --ring: 217 91% 60%;

  --radius: 0.75rem;
}
```

---

## Implementation Notes

1. **Preserve existing functionality** - WebSocket streaming, agent execution tracking, document upload
2. **Maintain accessibility** - Color contrast ratios, focus states, semantic HTML
3. **Keep existing dependencies** - No new packages required
4. **Update in phases** - globals.css first, then components, then pages

---

## Success Criteria

- [ ] Cohesive Midnight Sapphire color scheme across all pages
- [ ] Sidebar with session history functional
- [ ] Collapsible agent panel with real-time status
- [ ] Smooth animations and transitions
- [ ] Responsive design works on mobile/tablet/desktop
- [ ] All existing features still work (chat, agents, documents)
- [ ] Accessible color contrast (WCAG AA)
