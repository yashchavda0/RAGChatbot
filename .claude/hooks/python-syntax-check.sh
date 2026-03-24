#!/bin/bash
# Python Syntax and Indentation Check
# Runs after Edit/Write on .py files

FILE_PATH="${CLAUDE_FILE_PATH}"

# Only run for Python files
if [[ "$FILE_PATH" == *.py ]]; then
    echo "🔍 Checking Python syntax: $FILE_PATH"

    # Check if file exists
    if [ ! -f "$FILE_PATH" ]; then
        echo "⚠️ File not found: $FILE_PATH"
        exit 0
    fi

    # Compile check (catches syntax and indentation errors)
    python -m py_compile "$FILE_PATH" 2>&1
    PY_COMPILE_STATUS=$?

    if [ $PY_COMPILE_STATUS -eq 0 ]; then
        echo "✅ Python syntax OK: $FILE_PATH"
    else
        echo "❌ Python syntax/indentation error in: $FILE_PATH"
        exit 1
    fi

    # AST parse check (detects structural issues)
    python -c "import ast; ast.parse(open('$FILE_PATH').read())" 2>&1
    AST_STATUS=$?

    if [ $AST_STATUS -ne 0 ]; then
        echo "❌ Code structure issue in: $FILE_PATH"
        exit 1
    fi

    # Check for common issues
    # Missing imports (basic check)
    if grep -qE "^\s*(from|import)\s+\S+\s*$" "$FILE_PATH"; then
        # Check if imported modules are used
        :
    fi

    # Check for TODO/FIXME without context
    if grep -qE "^\s*#\s*(TODO|FIXME):?\s*$" "$FILE_PATH"; then
        echo "⚠️ Empty TODO/FIXME comment found"
    fi

    # Check for unclosed brackets (basic)
    OPEN_PARENS=$(grep -o "(" "$FILE_PATH" | wc -l)
    CLOSE_PARENS=$(grep -o ")" "$FILE_PATH" | wc -l)
    if [ "$OPEN_PARENS" -ne "$CLOSE_PARENS" ]; then
        echo "⚠️ Mismatched parentheses: $OPEN_PARENS open, $CLOSE_PARENS close"
    fi

    echo "✅ All checks passed for: $FILE_PATH"
fi

exit 0
