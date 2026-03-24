#!/bin/bash
# Indentation Validation Check
# Ensures consistent indentation in Python and TypeScript files

FILE_PATH="${CLAUDE_FILE_PATH}"

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
    exit 0
fi

echo "🔍 Checking indentation: $FILE_PATH"

# Python indentation check
if [[ "$FILE_PATH" == *.py ]]; then
    # Check for mixed tabs and spaces
    HAS_TABS=$(grep -P '^\t' "$FILE_PATH" 2>/dev/null | wc -l)
    HAS_SPACES=$(grep -P '^    ' "$FILE_PATH" 2>/dev/null | wc -l)

    if [ "$HAS_TABS" -gt 0 ] && [ "$HAS_SPACES" -gt 0 ]; then
        echo "❌ Mixed tabs and spaces detected in: $FILE_PATH"
        echo "   Please use consistent indentation (4 spaces recommended)"
        exit 1
    fi

    # Check for non-standard indentation (not 4 spaces)
    if [ "$HAS_SPACES" -gt 0 ]; then
        # Check for 2-space indentation (common mistake)
        TWO_SPACE=$(grep -P '^  [^ ]' "$FILE_PATH" 2>/dev/null | grep -vP '^    ' | wc -l)
        if [ "$TWO_SPACE" -gt 0 ]; then
            echo "⚠️ Found 2-space indentation (Python standard is 4 spaces)"
        fi
    fi

    echo "✅ Python indentation check passed"
fi

# TypeScript/JavaScript indentation check
if [[ "$FILE_PATH" == *.ts ]] || [[ "$FILE_PATH" == *.tsx ]] || [[ "$FILE_PATH" == *.js ]] || [[ "$FILE_PATH" == *.jsx ]]; then
    # Check for mixed tabs and spaces
    HAS_TABS=$(grep -P '^\t' "$FILE_PATH" 2>/dev/null | wc -l)
    HAS_SPACES=$(grep -P '^  ' "$FILE_PATH" 2>/dev/null | wc -l)

    if [ "$HAS_TABS" -gt 0 ] && [ "$HAS_SPACES" -gt 0 ]; then
        echo "⚠️ Mixed tabs and spaces in: $FILE_PATH"
        echo "   Consider running: npx prettier --write \"$FILE_PATH\""
    fi

    echo "✅ TypeScript indentation check passed"
fi

exit 0
