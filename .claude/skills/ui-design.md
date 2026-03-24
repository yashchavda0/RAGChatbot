---
name: ui-design
description: Design and implement UI components with accessibility and responsive design
---

Design and implement UI components following best practices.

## Usage
```
/ui-design <component-name> [--responsive] [--accessible]
```

## Design Principles
- Mobile-first responsive design
- WCAG 2.1 AA accessibility
- Consistent spacing (4px grid)
- Color contrast >= 4.5:1

## Component Patterns
- Loading states with skeletons
- Error boundaries
- Empty states
- Responsive breakpoints (sm, md, lg, xl)

## Tailwind Utilities
- `cn()` for conditional classes
- Responsive: `sm:`, `md:`, `lg:`, `xl:`
- Dark mode: `dark:`

## Examples
```
/ui-design SearchBar --responsive --accessible
/ui-design Modal --accessible
```
