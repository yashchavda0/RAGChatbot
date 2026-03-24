---
name: dependency-check
description: Check for version conflicts in dependencies
user-invocable: false
---

Check for dependency version conflicts and security issues.

## Backend (requirements.txt)

### Critical Version Constraints
- `pydantic>=2.7.0,<3.0.0` (pydantic-settings requires 2.7+)
- `pydantic-settings>=2.3.0`
- FastAPI 0.104.1 compatible with pydantic 2.7.x

### Check Commands
```bash
pip check
pip-audit  # Security vulnerabilities
```

## Frontend (package.json)

### Known Issues
- Duplicate object spread: `{ prop: x.prop, ...x }` → TypeError
- Use: `{ ...update, prop: value }`

### Check Commands
```bash
npm outdated
npm audit
npx tsc --noEmit
```

## Resolution
- Always check pydantic version compatibility
- Test TypeScript after dependency updates
- Run full test suite after changes
