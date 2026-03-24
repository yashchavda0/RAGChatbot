"""
LangGraph node functions for the RAG chatbot system.
Each node represents an agent that processes the state and returns updated state.
"""
import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, List
from config import settings
from config.logging_config import get_logger, set_request_id
from graph.state import (
    RAGState,
    IntentType,
    update_agent_execution,
)

logger = get_logger(__name__)


# =============================================================================
# ORCHESTRATION NODES
# =============================================================================

async def intent_classifier_node(state: RAGState) -> RAGState:
    """
    Classify the user query into an intent type.
    Uses Gemini LLM for intelligent classification.
    """
    request_id = state.get("request_id", str(uuid.uuid4()))
    set_request_id(request_id)

    logger.info(f"Classifying intent for query: {state['query'][:50]}...")

    state = update_agent_execution(
        state,
        agent_id="intent_classifier",
        agent_name="Intent Classifier",
        status="running",
        input_data={"query": state["query"]},
    )

    try:
        # Import Gemini service (will be created later)
        from services.gemini_service import GeminiService

        gemini_service = GeminiService()

        # Classify intent using Gemini
        prompt = f"""Classify the following user query into one of these intents:
        - DOCUMENT_SEARCH: Query asking about information from uploaded documents
        - WEB_SEARCH: Query asking for current information, news, or general knowledge
        - OCR: Query mentioning images or scanned documents
        - URL_PROCESS: Query providing a URL to process
        - COMPLEX: Query requiring multiple steps or combining sources

        Query: {state['query']}

        Respond with only the intent name and confidence score (0-1) in format: INTENT|CONFIDENCE
        Example: DOCUMENT_SEARCH|0.95
        """

        response = await gemini_service.generate(prompt, temperature=0.1)

        # Parse response
        parts = response.strip().split("|")
        intent = parts[0].upper().strip() if len(parts) > 0 else IntentType.DOCUMENT_SEARCH
        confidence = float(parts[1]) if len(parts) > 1 else 0.8

        # Validate intent
        valid_intents = [
            IntentType.DOCUMENT_SEARCH,
            IntentType.WEB_SEARCH,
            IntentType.OCR,
            IntentType.URL_PROCESS,
            IntentType.COMPLEX,
        ]
        if intent not in valid_intents:
            intent = IntentType.COMPLEX  # Default to complex for unknown intents

        state["intent"] = intent
        state["intent_confidence"] = confidence

        # Update agent execution as completed
        state = update_agent_execution(
            state,
            agent_id="intent_classifier",
            agent_name="Intent Classifier",
            status="completed",
            input_data={"query": state["query"]},
            output_data={"intent": intent, "confidence": confidence},
        )

        logger.info(f"Intent classified: {intent} (confidence: {confidence})")

    except Exception as e:
        logger.error(f"Error in intent classification: {e}")
        state["intent"] = IntentType.COMPLEX  # Default to complex on error
        state["intent_confidence"] = 0.5
        state["error"] = str(e)

        state = update_agent_execution(
            state,
            agent_id="intent_classifier",
            agent_name="Intent Classifier",
            status="failed",
            input_data={"query": state["query"]},
            error_message=str(e),
        )

    return state


async def plan_generator_node(state: RAGState) -> RAGState:
    """
    Generate an execution plan for complex queries.
    Creates a task graph with nodes and edges.
    """
    logger.info(f"Generating plan for complex query: {state['query'][:50]}...")

    state = update_agent_execution(
        state,
        agent_id="plan_generator",
        agent_name="Plan Generator",
        status="running",
        input_data={"query": state["query"], "intent": state["intent"]},
    )

    try:
        from services.gemini_service import GeminiService

        gemini_service = GeminiService()

        # Generate plan using Gemini
        prompt = f"""Generate an execution plan for this complex query.
        Query: {state['query']}
        Intent: {state['intent']}

        Available agents:
        - document_search: Search uploaded documents
        - web_search: Search the web
        - ocr: Extract text from images
        - url_process: Process URL content
        - reranker: Rerank and merge results
        - response_synthesis: Generate final response

        Create a plan as JSON:
        {{
            "plan_id": "unique_id",
            "nodes": [
                {{"node_id": "1", "agent_id": "document_search", "dependencies": []}},
                {{"node_id": "2", "agent_id": "web_search", "dependencies": []}},
                {{"node_id": "3", "agent_id": "reranker", "dependencies": ["1", "2"]}},
                {{"node_id": "4", "agent_id": "response_synthesis", "dependencies": ["3"]}}
            ],
            "entry_node": "1",
            "description": "Plan description"
        }}

        Respond only with valid JSON.
        """

        response = await gemini_service.generate(prompt, temperature=0.3)

        # Parse JSON response
        import json
        try:
            # Extract JSON from response if there's extra text
            start = response.find("{")
            end = response.rfind("}") + 1
            json_str = response[start:end]
            plan = json.loads(json_str)
        except json.JSONDecodeError:
            # Fallback plan
            plan = {
                "plan_id": str(uuid.uuid4()),
                "nodes": [
                    {"node_id": "1", "agent_id": "document_search", "dependencies": []},
                    {"node_id": "2", "agent_id": "reranker", "dependencies": ["1"]},
                    {"node_id": "3", "agent_id": "response_synthesis", "dependencies": ["2"]},
                ],
                "entry_node": "1",
                "description": "Fallback plan",
            }

        state["plan"] = plan

        state = update_agent_execution(
            state,
            agent_id="plan_generator",
            agent_name="Plan Generator",
            status="completed",
            input_data={"query": state["query"]},
            output_data={"plan": plan},
        )

        logger.info(f"Plan generated: {plan.get('description', 'No description')}")

    except Exception as e:
        logger.error(f"Error generating plan: {e}")
        state["error"] = str(e)

        # Create fallback plan
        state["plan"] = {
            "plan_id": str(uuid.uuid4()),
            "nodes": [
                {"node_id": "1", "agent_id": "document_search", "dependencies": []},
                {"node_id": "2", "agent_id": "response_synthesis", "dependencies": ["1"]},
            ],
            "entry_node": "1",
            "description": "Fallback plan",
        }

        state = update_agent_execution(
            state,
            agent_id="plan_generator",
            agent_name="Plan Generator",
            status="failed",
            input_data={"query": state["query"]},
            error_message=str(e),
        )

    return state


async def plan_validator_node(state: RAGState) -> RAGState:
    """
    Validate the generated plan.
    Checks for circular dependencies, agent availability, and logical consistency.
    """
    logger.info("Validating generated plan...")

    state = update_agent_execution(
        state,
        agent_id="plan_validator",
        agent_name="Plan Validator",
        status="running",
        input_data={"plan": state.get("plan")},
    )

    try:
        plan = state.get("plan", {})

        if not plan:
            state["plan_validated"] = False
            state["plan_validation_notes"] = "No plan to validate"
            return state

        # Check for circular dependencies using topological sort
        nodes = plan.get("nodes", [])
        edges = plan.get("edges", [])

        # Build dependency graph
        graph = {node["node_id"]: node.get("dependencies", []) for node in nodes}

        # Check for cycles
        def has_cycle(graph):
            visited = set()
            rec_stack = set()

            def dfs(node):
                visited.add(node)
                rec_stack.add(node)
                for neighbor in graph.get(node, []):
                    if neighbor not in visited:
                        if dfs(neighbor):
                            return True
                    elif neighbor in rec_stack:
                        return True
                rec_stack.remove(node)
                return False

            for node in graph:
                if node not in visited:
                    if dfs(node):
                        return True
            return False

        has_cycle_error = has_cycle(graph)

        # Validate all agents exist
        valid_agents = {
            "document_search", "web_search", "ocr", "url_process",
            "reranker", "response_synthesis"
        }
        plan_agents = {node["agent_id"] for node in nodes}
        invalid_agents = plan_agents - valid_agents

        validation_notes = []
        is_valid = True

        if has_cycle_error:
            is_valid = False
            validation_notes.append("Plan contains circular dependencies")

        if invalid_agents:
            is_valid = False
            validation_notes.append(f"Invalid agents: {invalid_agents}")

        if not plan.get("entry_node"):
            is_valid = False
            validation_notes.append("No entry node specified")

        state["plan_validated"] = is_valid
        state["plan_validation_notes"] = "; ".join(validation_notes) if validation_notes else "Plan validated successfully"

        state = update_agent_execution(
            state,
            agent_id="plan_validator",
            agent_name="Plan Validator",
            status="completed",
            input_data={"plan": plan},
            output_data={"valid": is_valid, "notes": state["plan_validation_notes"]},
        )

        logger.info(f"Plan validation: {is_valid} - {state['plan_validation_notes']}")

    except Exception as e:
        logger.error(f"Error validating plan: {e}")
        state["plan_validated"] = False
        state["plan_validation_notes"] = f"Validation error: {str(e)}"

        state = update_agent_execution(
            state,
            agent_id="plan_validator",
            agent_name="Plan Validator",
            status="failed",
            error_message=str(e),
        )

    return state


# =============================================================================
# EXECUTION NODES
# =============================================================================

async def document_search_node(state: RAGState) -> RAGState:
    """
    Search documents in Milvus using all 3 embedding models.
    """
    logger.info(f"Searching documents for: {state['query'][:50]}...")

    state = update_agent_execution(
        state,
        agent_id="document_search",
        agent_name="Document Search",
        status="running",
        input_data={"query": state["query"]},
    )

    try:
        from services.milvus_service import MilvusService
        from services.embedding_service import EmbeddingService

        milvus_service = MilvusService()
        embedding_service = EmbeddingService()

        # Generate embeddings with all 3 models
        all_results = []

        for model_name in settings.embedding_models:
            logger.info(f"Searching with model: {model_name}")

            # Generate query embedding
            query_embedding = await embedding_service.embed_query(
                state["query"], model_name=model_name
            )

            # Search Milvus
            results = await milvus_service.search(
                query_embedding=query_embedding,
                embedding_model=model_name,
                top_k=20,  # Get more results for reranking
            )

            # Add model info to results
            for result in results:
                result["embedding_model"] = model_name

            all_results.extend(results)

        state["documents"] = all_results

        state = update_agent_execution(
            state,
            agent_id="document_search",
            agent_name="Document Search",
            status="completed",
            input_data={"query": state["query"]},
            output_data={"results_count": len(all_results)},
        )

        logger.info(f"Found {len(all_results)} document chunks")

    except Exception as e:
        logger.error(f"Error in document search: {e}")
        state["error"] = str(e)

        state = update_agent_execution(
            state,
            agent_id="document_search",
            agent_name="Document Search",
            status="failed",
            error_message=str(e),
        )

    return state


async def web_search_node(state: RAGState) -> RAGState:
    """
    Perform web search using Tavily API.
    """
    logger.info(f"Performing web search for: {state['query'][:50]}...")

    state = update_agent_execution(
        state,
        agent_id="web_search",
        agent_name="Web Search",
        status="running",
        input_data={"query": state["query"]},
    )

    try:
        from services.tavily_service import TavilyService

        tavily_service = TavilyService()

        results = await tavily_service.search(
            query=state["query"],
            max_results=settings.tavily_max_results,
        )

        state["web_results"] = results

        state = update_agent_execution(
            state,
            agent_id="web_search",
            agent_name="Web Search",
            status="completed",
            input_data={"query": state["query"]},
            output_data={"results_count": len(results)},
        )

        logger.info(f"Found {len(results)} web results")

    except Exception as e:
        logger.error(f"Error in web search: {e}")
        state["error"] = str(e)

        state = update_agent_execution(
            state,
            agent_id="web_search",
            agent_name="Web Search",
            status="failed",
            error_message=str(e),
        )

    return state


async def ocr_node(state: RAGState) -> RAGState:
    """
    Process images using PaddleOCR.
    """
    logger.info("Processing OCR...")

    state = update_agent_execution(
        state,
        agent_id="ocr",
        agent_name="OCR Agent",
        status="running",
        input_data={"has_images": True},
    )

    # OCR implementation would go here
    # For now, this is a placeholder

    state["ocr_results"] = []

    state = update_agent_execution(
        state,
        agent_id="ocr",
        agent_name="OCR Agent",
        status="completed",
        output_data={"results_count": 0},
    )

    return state


async def url_processing_node(state: RAGState) -> RAGState:
    """
    Process URL content.
    """
    logger.info("Processing URL...")

    state = update_agent_execution(
        state,
        agent_id="url_process",
        agent_name="URL Processing",
        status="running",
        input_data={"query": state["query"]},
    )

    # URL processing implementation would go here
    # For now, this is a placeholder

    state["url_results"] = []

    state = update_agent_execution(
        state,
        agent_id="url_process",
        agent_name="URL Processing",
        status="completed",
        output_data={"results_count": 0},
    )

    return state


async def reranker_node(state: RAGState) -> RAGState:
    """
    Rerank and merge results from all sources using BAAI reranker.
    """
    logger.info("Reranking results...")

    state = update_agent_execution(
        state,
        agent_id="reranker",
        agent_name="Reranker",
        status="running",
        input_data={
            "documents_count": len(state.get("documents", [])),
            "web_results_count": len(state.get("web_results", [])),
        },
    )

    try:
        from services.baai_reranker_service import BAARerankerService

        reranker_service = BAARerankerService()

        # Combine all results
        all_results = []

        # Add document results
        for doc in state.get("documents", []):
            all_results.append({
                "content": doc.get("content", ""),
                "source": "document",
                "metadata": doc,
            })

        # Add web results
        for web in state.get("web_results", []):
            all_results.append({
                "content": web.get("content", web.get("snippet", "")),
                "source": "web",
                "metadata": web,
            })

        # Rerank
        if all_results:
            reranked = await reranker_service.rerank(
                query=state["query"],
                documents=all_results,
                top_k=settings.reranker_top_k,
            )

            state["reranked_results"] = reranked
        else:
            state["reranked_results"] = []

        state = update_agent_execution(
            state,
            agent_id="reranker",
            agent_name="Reranker",
            status="completed",
            output_data={"results_count": len(state.get("reranked_results", []))},
        )

        logger.info(f"Reranked to {len(state.get('reranked_results', []))} results")

    except Exception as e:
        logger.error(f"Error in reranking: {e}")
        # Use original results if reranking fails
        state["reranked_results"] = state.get("documents", [])[:settings.reranker_top_k]

        state = update_agent_execution(
            state,
            agent_id="reranker",
            agent_name="Reranker",
            status="failed",
            error_message=str(e),
        )

    return state


async def response_synthesis_node(state: RAGState) -> RAGState:
    """
    Synthesize the final response using Gemini LLM.
    """
    logger.info("Synthesizing final response...")

    state = update_agent_execution(
        state,
        agent_id="response_synthesis",
        agent_name="Response Synthesis",
        status="running",
        input_data={"query": state["query"]},
    )

    try:
        from services.gemini_service import GeminiService

        gemini_service = GeminiService()

        # Build context from reranked results
        context_parts = []
        sources = []

        for i, result in enumerate(state.get("reranked_results", [])[:5], 1):
            content = result.get("content", "")
            source_type = result.get("source", "unknown")
            metadata = result.get("metadata", {})

            context_parts.append(f"[Source {i} - {source_type}]: {content}")

            # Track sources
            if source_type == "document":
                sources.append({
                    "type": "document",
                    "filename": metadata.get("filename", "Unknown"),
                    "chunk_id": metadata.get("chunk_id", ""),
                })
            elif source_type == "web":
                sources.append({
                    "type": "web",
                    "url": metadata.get("url", ""),
                    "title": metadata.get("title", ""),
                })

        context = "\n\n".join(context_parts)

        # Generate response
        prompt = f"""Based on the following context, answer the user's query.
Provide a comprehensive response with proper citations.

User Query: {state['query']}

Context:
{context}

Instructions:
1. Answer the query based on the provided context
2. Cite sources using [Source N] notation
3. If the context doesn't contain enough information, say so
4. Be concise but thorough

Response:"""

        response = await gemini_service.generate(
            prompt=prompt,
            temperature=settings.gemini_temperature,
            max_tokens=settings.gemini_max_tokens,
        )

        state["final_response"] = response
        state["response_sources"] = sources

        state = update_agent_execution(
            state,
            agent_id="response_synthesis",
            agent_name="Response Synthesis",
            status="completed",
            output_data={"response_length": len(response)},
        )

        logger.info(f"Generated response: {len(response)} chars")

    except Exception as e:
        logger.error(f"Error synthesizing response: {e}")
        state["error"] = str(e)
        state["final_response"] = "I apologize, but I encountered an error while generating the response."

        state = update_agent_execution(
            state,
            agent_id="response_synthesis",
            agent_name="Response Synthesis",
            status="failed",
            error_message=str(e),
        )

    return state
