#!/bin/bash
# TypeScript Syntax and Type Check
# Runs after Edit/Write on .ts and .tsx files

FILE_PATH="${CLAUDE_FILE_PATH}"

# Only run for TypeScript files
if [[ "$FILE_PATH" == *.ts ]] || [[ "$FILE_PATH" == *.tsx ]]; then
    echo "🔍 Checking TypeScript: $FILE_PATH"

    # Check if file exists
    if [ ! -f "$FILE_PATH" ]; then
        echo "⚠️ File not found: $FILE_PATH"
        exit 0
    fi

    # Get the relative path from frontend directory
    REL_PATH="${FILE_PATH#frontend/}"
    FRONTEND_DIR="${FILE_PATH%/src/*}/"

    # Check if we're in a frontend context
    if [ -d "frontend" ]; then
        cd frontend

        # Run TypeScript check if tsconfig exists
        if [ -f "tsconfig.json" ]; then
            npx tsc --noEmit "$REL_PATH" 2>&1 | head -30
            TSC_STATUS=$?

            if [ $TSC_STATUS -eq 0 ]; then
                echo "✅ TypeScript check OK: $FILE_PATH"
            else
                echo "⚠️ TypeScript issues in: $FILE_PATH"
            fi
        fi
    fi

    # Check for common issues
    # Unclosed JSX tags (basic)
    if [[ "$FILE_PATH" == *.tsx ]]; then
        OPEN_TAGS=$(grep -oE "<[A-Z][a-zA-Z]*" "$FILE_PATH" | wc -l)
        CLOSE_TAGS=$(grep -oE "</[A-Z][a-zA-Z]*>" "$FILE_PATH" | wc -l)
        SELF_CLOSE=$(grep -oE "/>" "$FILE_PATH" | wc -l)

        if [ "$OPEN_TAGS" -gt $((CLOSE_TAGS + SELF_CLOSE)) ]; then
            echo "⚠️ Potentially unclosed JSX tags"
        fi
    fi

    # Check for duplicate object spread (known issue pattern)
    if grep -qE '\{\s*\w+:\s*\w+\.\w+,\s*\.\.\.\w+\s*\}' "$FILE_PATH"; then
        echo "⚠️ Potential duplicate object spread detected. Use: { ...obj, prop: value }"
    fi

    echo "✅ TypeScript checks completed for: $FILE_PATH"
fi

exit 0
