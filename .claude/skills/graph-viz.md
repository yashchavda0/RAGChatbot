---
name: graph-viz
description: Generate LangGraph visualization
---

Generate visual representation of the LangGraph workflow.

## Usage
```
/graph-viz [--output path] [--format svg|png|mermaid]
```

## Graph Structure
```
START
  ↓
intent_classifier
  ↓
route_by_intent
  ├── DOCUMENT_SEARCH → document_search
  ├── WEB_SEARCH → web_search
  ├── OCR → ocr
  ├── URL_PROCESS → url_processing
  └── COMPLEX → plan_generator → [multi-step]
  ↓
reranker
  ↓
response_synthesis
  ↓
check_final_response ─→ RETRY (back to routing)
  ↓
END
```

## Output
- Mermaid diagram for markdown
- SVG/PNG for documentation
- JSON for programmatic use

## Examples
```
/graph-viz
/graph-viz --format mermaid --output docs/graph.md
```
