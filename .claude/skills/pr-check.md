---
name: pr-check
description: Run pre-PR checklist validation
disable-model-invocation: true
---

Execute comprehensive pre-PR validation checklist.

## Usage
```
/pr-check [--full] [--fix]
```

## Checklist

### Code Quality
- [ ] No console.log/print statements
- [ ] No commented-out code
- [ ] No hardcoded credentials
- [ ] Functions under 50 lines

### Security
- [ ] Input validation on all inputs
- [ ] No SQL/XSS vulnerabilities
- [ ] Environment variables for secrets
- [ ] CORS configured properly

### Performance
- [ ] No N+1 queries
- [ ] Pagination for large data
- [ ] Proper caching

### Testing
- [ ] Unit tests for new code
- [ ] Integration tests for APIs
- [ ] All tests passing

### Documentation
- [ ] API endpoints documented
- [ ] README updated if needed
- [ ] .env.example updated

## Project-Specific
- [ ] Agent changes update registry
- [ ] Graph edge changes tested
- [ ] Pydantic >=2.7.0 compatible
- [ ] No duplicate TypeScript spreads

## Examples
```
/pr-check
/pr-check --full --fix
```
