---
name: new-component
description: Create React component with Tailwind CSS styling
---

Generate a new React component following project patterns.

## Usage
```
/new-component <component-name> [--type ui|chat|agents|documents]
```

## Component Template
```typescript
import { cn } from "@/lib/utils";

interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

export function Component({ className, children, disabled }: ComponentProps) {
  return (
    <div className={cn("base-styles", disabled && "opacity-50", className)}>
      {children}
    </div>
  );
}
```

## Types
- `ui`: Generic UI (button, card, input)
- `chat`: Chat components (message, input)
- `agents`: Agent visualization
- `documents`: Document upload/management

## Location
```
frontend/src/components/<type>/<ComponentName>.tsx
`` ```

## Export
Add to `frontend/src/components/<type>/index.ts`:
```

## Examples
```
/new-component SearchBar --type ui
/new-component TypingIndicator --type chat
```
