---
name: add-agent
description: Create a new LangGraph agent with registration and routing
---

Generate a new agent for the RAG system with proper registration.

## Usage
```
/add-agent <agent-name> [--type execution|orchestration|indexing] [--capabilities cap1,cap2]
```

## Agent Template
```python
@register_agent(
    agent_id="<agent_id>",
    name="<Agent Name>",
    capabilities=["capability1"],
    description="What the agent does"
)
class <AgentName>Agent(BaseAgent):
    async def execute(self, state: RAGState) -> RAGState:
        self._log_start(state)
        try:
            result = await self._execute_logic(state)
            state = self._update_state(state, result)
            state = self._track_execution(state, success=True)
            return state
        except Exception as e:
            state = self._track_execution(state, success=False, error=str(e))
            return state
```

## Steps
1. Create file in `backend/agents/<type>/<agent_name>.py`
2. Import in `backend/agents/__init__.py`
3. Add routing in `backend/graph/edges.py` if needed
4. Add to graph in `backend/graph/rag_graph.py`

## Examples
```
/add-agent sentiment_analyzer --type execution --capabilities sentiment,analysis
/add-agent query_rewriter --type orchestration --capabilities rewrite,optimization
```
