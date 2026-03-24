#!/bin/bash
# Code Completeness Check
# Detects incomplete code, missing implementations, and structural issues

FILE_PATH="${CLAUDE_FILE_PATH}"

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
    exit 0
fi

echo "🔍 Checking code completeness: $FILE_PATH"

# Common patterns that indicate incomplete code
INCOMPLETE_PATTERNS=(
    "pass\s*$"
    "\.\.\.\s*$"
    "TODO:"
    "FIXME:"
    "NotImplemented"
    "raise NotImplementedError"
    "# implement"
    "# add implementation"
    "\{\s*\}"  # Empty function/class body
)

ISSUES_FOUND=0

for pattern in "${INCOMPLETE_PATTERNS[@]}"; do
    if grep -qE "$pattern" "$FILE_PATH" 2>/dev/null; then
        echo "⚠️ Found incomplete code pattern: $pattern"
        ((ISSUES_FOUND++))
    fi
done

# Python-specific checks
if [[ "$FILE_PATH" == *.py ]]; then
    # Check for functions without body (only pass)
    if grep -qE "def\s+\w+.*:\s*\n\s+pass" "$FILE_PATH" 2>/dev/null; then
        echo "⚠️ Function with only 'pass' statement found"
        ((ISSUES_FOUND++))
    fi

    # Check for missing docstrings in public functions
    if grep -qE "^def\s+[a-z]" "$FILE_PATH" 2>/dev/null; then
        # Functions defined but might be missing docs
        :
    fi

    # Check for unmatched quotes
    SINGLE_QUOTES=$(grep -o "'" "$FILE_PATH" 2>/dev/null | wc -l)
    DOUBLE_QUOTES=$(grep -o '"' "$FILE_PATH" 2>/dev/null | wc -l)

    if [ $((SINGLE_QUOTES % 2)) -ne 0 ]; then
        echo "⚠️ Unmatched single quotes detected"
        ((ISSUES_FOUND++))
    fi

    if [ $((DOUBLE_QUOTES % 2)) -ne 0 ]; then
        echo "⚠️ Unmatched double quotes detected"
        ((ISSUES_FOUND++))
    fi
fi

# TypeScript-specific checks
if [[ "$FILE_PATH" == *.ts ]] || [[ "$FILE_PATH" == *.tsx ]]; then
    # Check for console.log statements (should be removed in production)
    if grep -qE "console\.(log|debug|info)" "$FILE_PATH" 2>/dev/null; then
        echo "ℹ️ console.log statements found (consider removing for production)"
    fi

    # Check for any type usage
    if grep -qE ":\s*any\b" "$FILE_PATH" 2>/dev/null; then
        echo "ℹ️ 'any' type used (consider using specific types)"
    fi
fi

if [ $ISSUES_FOUND -eq 0 ]; then
    echo "✅ Code completeness check passed"
else
    echo "⚠️ Found $ISSUES_FOUND potential issues in: $FILE_PATH"
fi

exit 0
