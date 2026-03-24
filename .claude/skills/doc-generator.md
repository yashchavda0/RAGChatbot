---
name: doc-generator
description: Generate comprehensive documentation (API docs, README, architecture)
disable-model-invocation: true
---

Generate comprehensive documentation for the RAG chatbot project.

## Usage
```
/doc-generator [type]
```

## Types
- `api`: API endpoint documentation
- `readme`: Project README.md
- `architecture`: System architecture diagrams
- `all`: Generate all documentation

## Output Structure
```
docs/
├── api/
│   ├── endpoints.md
│   ├── websockets.md
│   └── examples.md
├── architecture/
│   ├── overview.md
│   ├── agents.md
│   └── data-flow.md
└── README.md
```

## Examples
```
/doc-generator api
/doc-generator readme
/doc-generator all
```
