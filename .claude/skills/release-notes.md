---
name: release-notes
description: Generate release notes from git history
disable-model-invocation: true
---

Generate comprehensive release notes from recent changes.

## Usage
```
/release-notes [--from <tag>] [--to <tag>]
```

## Categories
| Prefix | Category |
|--------|----------|
| feat: | Features |
| fix: | Bug Fixes |
| docs: | Documentation |
| refactor: | Refactoring |
| test: | Testing |
| chore: | Maintenance |
| perf: | Performance |

## Output Template
```markdown
# Release Notes - vX.X.X

## New Features
- feat: description

## Bug Fixes
- fix: description

## Breaking Changes
- breaking: description

## Dependencies
- Added: package
- Updated: package
- Removed: package
```

## Examples
```
/release-notes
/release-notes --from v1.0.0 --to v1.1.0
```
