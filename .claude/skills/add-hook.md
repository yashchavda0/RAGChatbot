---
name: add-hook
description: Create custom React hook with TypeScript types
---

Generate a custom React hook for state management.

## Usage
```
/add-hook <hook-name> [--type state|fetch|form|ui|websocket]
```

## Hook Types

### State Hook
```typescript
import { useState, useCallback, useMemo } from "react";

interface UseHookReturn {
  state: StateType;
  setState: (state: StateType) => void;
  reset: () => void;
}

```

### Fetch Hook
```typescript
import { useState, useCallback, useEffect } from "react";
import axios from "axios";

interface UseFetchReturn {
  data: DataType | null;
  isLoading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  refresh: () => Promise<void>;
}
```

### Form Hook
```typescript
import { useState, useCallback } from "react";

// Form validation and submission handling
```

### WebSocket Hook
```typescript
import { useState, useEffect, useCallback, from "react";
// WebSocket connection management
```

## Location
```
frontend/src/hooks/use<HookName>.ts
`` ```

## Export
Add to `frontend/src/hooks/index.ts`:
```

## Examples
```
/add-hook useDocumentList --type fetch
/add-hook useChatForm --type form
/add-hook useChatSocket --type websocket
```
