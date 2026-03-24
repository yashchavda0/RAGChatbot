---
name: logging-setup
description: Configure and manage logging infrastructure
---

Set up comprehensive logging for the RAG chatbot.

## Usage
```
/logging-setup <action> [options]
```

## Actions
- `init`: Initialize logging configuration
- `add-logger`: Add new logger
- `configure`: Update logging levels
- `export`: Export logs
- `analyze`: Analyze log patterns

## Log Levels
- DEBUG: Detailed debugging info
- INFO: General operational info
- WARNING: Warning conditions
- ERROR: Error conditions
- CRITICAL: Critical failures

## Current Setup
```python
# backend/config/logging_config.py
LOGGING_CONFIG = {
    "version": 1,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        }
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
        "loki": {"class": "logging_loki.LokiHandler"}
    }
}
```

## Structured Logging
```python
import structlog

logger = structlog.get_logger()
logger.info("query_processed", query_id="123", latency_ms=150)
```

## Examples
```
/logging-setup init
/logging-setup add-logger agents --level DEBUG
/logging-setup export --format json --output logs/
```
