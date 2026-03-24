# Post-Edit Code Quality Check Hook

This hook runs after every Edit or Write operation to verify code quality.

## What it checks:
1. **Python Syntax** - Validates .py files compile without errors
2. **Indentation** - Ensures proper Python indentation
3. **Missing Code** - Detects incomplete code blocks
4. **TypeScript** - Validates .ts and .tsx files

## Hook Configuration

### For Python Files (.py)
```bash
# Check syntax and indentation
python -m py_compile "${CLAUDE_FILE_PATH}"

# Check AST structure (detects missing code)
python -c "import ast; ast.parse(open('${CLAUDE_FILE_PATH}').read())"
```

### For TypeScript Files (.ts, .tsx)
```bash
# Type check with TypeScript
cd frontend && npx tsc --noEmit "${CLAUDE_FILE_PATH#frontend/}"
```

## Common Issues Detected

### Python
- Missing colons after if/for/while/def/class
- Mismatched indentation (mixing tabs and spaces)
- Unclosed brackets/parentheses
- Missing import statements
- Incomplete function definitions

### TypeScript
- Missing type annotations
- Unclosed JSX tags
- Invalid syntax
- Type mismatches
