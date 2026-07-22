"""
Response Synthesis Agent — source-strict, mode-aware, with caching and timing.

V2 changes:
- Source strict: document answers use compressed_context only; web answers use web_results only
- Tracks generation_latency_ms
- Stores response in response cache
- Logs token usage to observability service
"""

import re
import time
from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)

_BACKEND_INSTRUCTIONS = """
## Response Guidelines (Mandatory)
- Answer based ONLY on the provided context. Do not use external knowledge.
- Do NOT include citation numbers like [1], [2], [3] or any reference markers.
- Do NOT fabricate or infer information beyond what is explicitly in the context.
- If the context lacks sufficient information, state: "I don't have enough information to answer this based on the available sources."
- Keep responses clear, concise, and well-structured.
- Do not include phrases like "Based on the context..." — answer directly.
- Maintain a professional and helpful tone.
- Always answer in the same language the user used in their question — even if the provided context is in a different language. Do not switch languages unless the user explicitly asks."""

_WEB_NOTE = "\n- This answer is based on web search results, not uploaded documents."

_CLARIFY_INSTRUCTIONS = """

## Clarification Mode
Using the conversation history to resolve references like "it", "that", or "the previous one", \
decide whether the User Query can be answered clearly and unambiguously from the Context below.
- If YES: give a normal grounded answer.
- If NO — the query is ambiguous, underspecified, or could reasonably mean two or more different \
things, and the Context does not resolve which — do NOT guess. Ask exactly one short, specific \
clarifying question instead.

Wrap your ENTIRE reply in exactly one of:
<answer>...</answer>
<clarify><question>...</question><options><option>...</option><option>...</option></options></clarify>
The <options> block is OPTIONAL — include it only when there are 2-3 clearly enumerable likely \
meanings, each written as a short standalone follow-up the user could send as-is. Output nothing \
outside these tags."""

_CLARIFY_OVERRIDE = """

## Clarification Cap Reached
You have already asked a clarifying question in each of the last 2 turns. Do NOT ask another. \
You MUST give your best-effort <answer> now using the available Context and conversation history, \
even if some ambiguity remains — state any assumption briefly if useful."""

_SAFE_FACTS = [
    "Honey never spoils. Sealed honey has been found in ancient containers and remained edible for thousands of years.",
    "Octopuses have three hearts, and two of them stop beating while the animal swims.",
    "Bananas are berries, but strawberries are not.",
    "A day on Venus is longer than a year on Venus.",
    "The Eiffel Tower can grow by around 15 centimeters in summer because metal expands with heat.",
]

_TOPIC_STOPWORDS = {
    "about",
    "after",
    "before",
    "could",
    "give",
    "have",
    "into",
    "just",
    "more",
    "need",
    "show",
    "tell",
    "than",
    "that",
    "them",
    "they",
    "this",
    "what",
    "when",
    "where",
    "which",
    "while",
    "with",
    "would",
    "from",
    "your",
    "please",
    "help",
    "search",
    "query",
    "using",
    "based",
    "available",
    "sources",
}

_UNSAFE_SUGGESTION_TERMS = {
    "kill",
    "murder",
    "bomb",
    "terrorist",
    "shoot",
    "rape",
    "molest",
    "porn",
    "suicide",
    "selfharm",
}

_INAPPROPRIATE_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"\b(?:hate|racial slur|sexually explicit|porn|rape|molest)\b",
        r"\b(?:kill|murder|bomb|terrorist|shoot)\b.*\b(?:how|ways|guide|steps)\b",
        r"\b(?:self[- ]?harm|suicide)\b.*\b(?:how|ways|guide|steps)\b",
    )
]


def parse_answer(response: str) -> str:
    match = re.search(r"<answer>\s*(.*?)\s*</answer>", response, re.DOTALL)
    if match:
        return match.group(1).strip()
    response = re.sub(r"</?answer>", "", response)
    response = re.sub(r"<sources>.*?</sources>", "", response, flags=re.DOTALL)
    return response.strip()


def parse_synthesis_output(response: str) -> tuple[str, str, list[str]]:
    """Parse clarify-mode LLM output. Returns (mode, text, options).

    mode is "clarify" or "answer". Any output without a well-formed <clarify>
    block is treated as a normal answer (mirrors parse_answer's own graceful
    degrade for malformed tags), so a model that ignores the clarify
    convention never breaks the turn.
    """
    clarify_match = re.search(r"<clarify>\s*(.*?)\s*</clarify>", response, re.DOTALL)
    if clarify_match:
        block = clarify_match.group(1)
        q_match = re.search(r"<question>\s*(.*?)\s*</question>", block, re.DOTALL)
        options = re.findall(r"<option>\s*(.*?)\s*</option>", block, re.DOTALL)
        question = (q_match.group(1) if q_match else block).strip()
        if question:
            return "clarify", question, [o.strip() for o in options if o.strip()][:3]
    return "answer", parse_answer(response), []


def _normalize_terms(query: str) -> list[str]:
    tokens = re.findall(r"[A-Za-z0-9][A-Za-z0-9+#.-]+", query.lower())
    terms: list[str] = []
    for token in tokens:
        if len(token) < 4 or token in _TOPIC_STOPWORDS:
            continue
        if token not in terms:
            terms.append(token)
        if len(terms) == 3:
            break
    return terms


def _extract_safe_terms(text: str, limit: int = 8) -> list[str]:
    tokens = re.findall(r"[A-Za-z0-9][A-Za-z0-9+#.-]+", (text or "").lower())
    terms: list[str] = []
    for token in tokens:
        compact = token.replace("-", "")
        if len(token) < 4 or token in _TOPIC_STOPWORDS:
            continue
        if compact in _UNSAFE_SUGGESTION_TERMS:
            continue
        if token not in terms:
            terms.append(token)
        if len(terms) >= limit:
            break
    return terms


def _recent_user_text(state: RAGState) -> str:
    history = state.get("conversation_history", []) or []
    for msg in reversed(history):
        if msg.get("role") == "user" and msg.get("content"):
            return str(msg.get("content"))
    return ""


def _evidence_text(state: RAGState) -> str:
    parts: list[str] = []

    for doc in (state.get("compressed_context", []) or [])[:3]:
        parts.append(str(doc.get("source", "")))
        parts.append(str(doc.get("content", ""))[:220])

    if not parts:
        for item in (state.get("reranked_results", []) or [])[:3]:
            meta = item.get("metadata", item)
            parts.append(str(meta.get("title", "")))
            parts.append(str(meta.get("source_name", meta.get("filename", ""))))
            parts.append(str(item.get("content", ""))[:220])

    return " ".join(p for p in parts if p)


def _build_focus_phrase(query: str, state: RAGState) -> str:
    rewritten = str(state.get("query_rewritten") or "")
    recent_user = _recent_user_text(state)
    terms = _extract_safe_terms(f"{query} {rewritten} {recent_user}", limit=5)
    if terms:
        return " ".join(terms[:3])
    return "your question"


def _dedupe_keep_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        key = re.sub(r"\s+", " ", item.strip().lower())
        if key and key not in seen:
            seen.add(key)
            out.append(item.strip())
    return out


def _select_fact(query: str) -> str:
    if not query:
        return _SAFE_FACTS[0]
    index = sum(ord(ch) for ch in query) % len(_SAFE_FACTS)
    return _SAFE_FACTS[index]


def _is_inappropriate_query(query: str) -> bool:
    return any(pattern.search(query) for pattern in _INAPPROPRIATE_PATTERNS)


def _is_insufficient_answer(answer: str) -> bool:
    normalized = re.sub(r"\s+", " ", (answer or "").strip().lower())
    if not normalized:
        return True

    insufficient_markers = (
        "i don't have enough information to answer this based on the available sources",
        "i do not have enough information to answer this based on the available sources",
        "i don't have enough information",
        "i do not have enough information",
        "insufficient information",
        "not enough information",
    )
    return any(marker in normalized for marker in insufficient_markers)


def _build_suggested_questions(
    query: str, fallback_reason: str, state: RAGState
) -> list[str]:
    focus = _build_focus_phrase(query, state)
    evidence_terms = _extract_safe_terms(_evidence_text(state), limit=4)
    evidence_hint = " and ".join(evidence_terms[:2]) if evidence_terms else ""

    recent_user = _recent_user_text(state)
    recent_terms = _extract_safe_terms(recent_user, limit=3)
    recent_hint = " ".join(recent_terms[:2]) if recent_terms else ""

    if fallback_reason == "inappropriate":
        if focus != "your question":
            return [
                f"Can you explain {focus} in a safe, high-level way?",
                f"What are the risks and ethical concerns around {focus}?",
                f"What legitimate learning resources exist for {focus}?",
            ]
        return [
            "Can you explain this topic in a safe, high-level way?",
            "What are the risks and ethical concerns here?",
            "Can you suggest a legal and constructive alternative?",
        ]

    suggestions: list[str] = []
    suggestions.append(f"Can you give me a concise overview of {focus}?")

    if evidence_hint:
        suggestions.append(
            f"Should I focus the next search on {evidence_hint} for {focus}?"
        )
    elif recent_hint:
        suggestions.append(
            f"Should I focus on {recent_hint} as the next step for {focus}?"
        )
    else:
        suggestions.append(
            f"What details should I provide so you can answer {focus} better?"
        )

    if fallback_reason == "search_error":
        suggestions.append(
            f"Can you re-run this with a narrower query and timeframe for {focus}?"
        )
    else:
        suggestions.append(
            f"Can you turn {focus} into 3 targeted search questions I can ask next?"
        )

    return _dedupe_keep_order(suggestions)[:3]


def _set_fallback_response(state: RAGState, query: str, fallback_reason: str) -> None:
    fact = _select_fact(query)
    suggestions = _build_suggested_questions(query, fallback_reason, state)

    if fallback_reason == "inappropriate":
        response = (
            "I can't help with that request. If you'd like, I can still help with a safer version of the topic.\n\n"
            f"Interesting fact: {fact}"
        )
    elif fallback_reason == "search_error":
        response = (
            "I couldn't complete a reliable knowledge-base or web lookup for that request right now.\n\n"
            f"Interesting fact: {fact}"
        )
    else:
        response = (
            "I couldn't find enough reliable information in the knowledge base or web results for that request.\n\n"
            f"Interesting fact: {fact}"
        )

    state["final_response"] = response
    state["fallback_reason"] = fallback_reason
    state["requires_clarification"] = False
    state["suggested_questions"] = suggestions
    state["response_sources"] = []
    state["answer_source"] = "fallback"
    state["token_usage"] = {}


@register_agent(
    agent_id="response_synthesis",
    name="Response Synthesis",
    capabilities=["synthesis", "generation", "llm"],
    description="Source-strict response synthesis from compressed context or web results",
)
class ResponseSynthesisAgent(BaseAgent):

    async def execute(self, state: RAGState) -> RAGState:
        query = state.get("query_rewritten") or state.get("query", "")
        answer_source = state.get("answer_source", "documents")

        update_agent_execution(
            state,
            self.agent_id,
            self.agent_name,
            "running",
            {"query": query[:80], "answer_source": answer_source},
        )

        t_start = time.monotonic()

        # --- Build context and sources (source-strict) ---
        context_parts: list[str] = []
        sources: list[dict] = []

        if answer_source == "web":
            for i, web in enumerate(state.get("web_results", [])[:10], 1):
                content = (
                    web.get("content") or web.get("snippet") or web.get("text", "")
                )
                context_parts.append(
                    f"[Web Source {i} - {web.get('title', 'Untitled')}]: {content}"
                )
                sources.append(
                    {
                        "type": "web",
                        "url": web.get("url", ""),
                        "title": web.get("title", ""),
                        "snippet": content[:200],
                    }
                )
        else:
            # Use compressed_context if available; fall back to reranked_results
            compressed = state.get("compressed_context", [])
            if compressed:
                for i, doc in enumerate(compressed, 1):
                    context_parts.append(
                        f"[Document {i} - {doc.get('source', 'Unknown')}]: {doc.get('content', '')}"
                    )
                    sources.append(
                        {
                            "type": "document",
                            "filename": doc.get("source", "Unknown"),
                            "document_id": doc.get("document_id", ""),
                            "chunk_id": doc.get("chunk_id", ""),
                            "similarity_score": float(doc.get("score", 0.0)),
                            "content_preview": doc.get("content", "")[:200],
                        }
                    )
            else:
                # Fallback to reranked_results (e.g. when compression disabled)
                for i, result in enumerate(state.get("reranked_results", [])[:10], 1):
                    content = result.get("content", "")
                    meta = result.get("metadata", result)
                    src_type = result.get("source", "document")
                    context_parts.append(f"[Source {i} - {src_type}]: {content}")
                    if src_type == "document":
                        sources.append(
                            {
                                "type": "document",
                                "filename": meta.get(
                                    "source_name", meta.get("filename", "Unknown")
                                ),
                                "document_id": meta.get("document_id", ""),
                                "chunk_id": meta.get("chunk_id", ""),
                                "similarity_score": float(meta.get("score", 0.0)),
                                "content_preview": content[:200],
                            }
                        )
                    elif src_type == "web":
                        sources.append(
                            {
                                "type": "web",
                                "url": meta.get("url", ""),
                                "title": meta.get("title", ""),
                                "snippet": content[:200],
                            }
                        )

        context = (
            "\n\n".join(context_parts)
            if context_parts
            else "No relevant context found."
        )

        if _is_inappropriate_query(query):
            _set_fallback_response(state, query, "inappropriate")
            update_agent_execution(
                state,
                self.agent_id,
                self.agent_name,
                "completed",
                {"query": query},
                {
                    "response_length": len(state["final_response"]),
                    "answer_source": "fallback",
                    "fallback_reason": "inappropriate",
                },
            )
            return state

        if not context_parts:
            fallback_reason = "search_error" if state.get("error") else "no_results"
            _set_fallback_response(state, query, fallback_reason)
            update_agent_execution(
                state,
                self.agent_id,
                self.agent_name,
                "completed",
                {"query": query, "answer_source": answer_source},
                {
                    "response_length": len(state["final_response"]),
                    "answer_source": "fallback",
                    "fallback_reason": fallback_reason,
                },
            )
            return state

        try:
            from services.llm_service import get_llm_service
            from services.observability import get_observability_service
            from services.cache_service import get_cache_service

            llm = get_llm_service()
            obs = get_observability_service()
            cache = get_cache_service()
            trace_id = state.get("langsmith_trace_id", "")

            system_prompt = state.get("system_prompt", "You are a helpful assistant.")
            extra = _WEB_NOTE if answer_source == "web" else ""
            clarify_mode = bool(state.get("clarification_enabled"))
            if clarify_mode:
                extra_clarify = (
                    _CLARIFY_OVERRIDE
                    if state.get("consecutive_clarifications", 0) >= 2
                    else _CLARIFY_INSTRUCTIONS
                )
                full_system = f"{system_prompt}\n{_BACKEND_INSTRUCTIONS}{extra}{extra_clarify}"
            else:
                full_system = f"{system_prompt}\n{_BACKEND_INSTRUCTIONS}{extra}"

            retry_note = (
                "\n\nNote: your previous answer scored low for source relevance. "
                "Make sure the answer is directly supported by — and tightly limited to — "
                "the context above."
                if state.get("retry_count", 0) > 0
                else ""
            )

            # Conversation history: framed as intent/reference context only, NOT a source of
            # facts, so the source-strict policy is preserved while enabling follow-ups.
            history_block = ""
            history = state.get("conversation_history", [])
            if history:
                history_lines = [
                    f"{m.get('role', 'user')}: {m.get('content', '')}" for m in history
                ]
                history_block = (
                    "Recent conversation (use ONLY to resolve references like 'it', 'that', "
                    "'the previous one', and to understand what the user is really asking; "
                    "do NOT treat it as a source of facts — facts must come only from the "
                    "Context below):\n"
                    + "\n".join(history_lines)
                    + "\n\n"
                )

            prompt = (
                f"{history_block}User Query: {query}\n\nContext:\n{context}\n\n"
                f"Provide a direct answer using only the context above.{retry_note}"
            )

            response = await llm.generate(
                prompt=prompt,
                system_prompt=full_system,
                temperature=settings.gemini_temperature,
                max_tokens=settings.gemini_max_tokens,
            )

            gen_latency_ms = (time.monotonic() - t_start) * 1000

            if clarify_mode:
                mode, clean, clarify_options = parse_synthesis_output(response)
                if mode == "clarify" and state.get("consecutive_clarifications", 0) >= 2:
                    logger.warning(
                        "Model returned <clarify> despite cap override; forcing answer."
                    )
                    mode, clean, clarify_options = "answer", parse_answer(response), []
            else:
                mode, clean, clarify_options = "answer", parse_answer(response), []

            if mode == "answer" and _is_insufficient_answer(clean):
                _set_fallback_response(state, query, "no_results")
                state["generation_latency_ms"] = gen_latency_ms
                update_agent_execution(
                    state,
                    self.agent_id,
                    self.agent_name,
                    "completed",
                    {"query": query, "answer_source": answer_source},
                    {
                        "response_length": len(state["final_response"]),
                        "answer_source": "fallback",
                        "generation_latency_ms": round(gen_latency_ms, 1),
                        "fallback_reason": "no_results",
                    },
                )
                return state

            try:
                prompt_tok = llm.count_tokens(prompt)
            except Exception:
                prompt_tok = len(prompt) // 4
            try:
                comp_tok = llm.count_tokens(response)
            except Exception:
                comp_tok = len(response) // 4

            token_usage = {
                "prompt_tokens": int(prompt_tok),
                "completion_tokens": int(comp_tok),
                "total_tokens": int(prompt_tok) + int(comp_tok),
            }

            obs.log_token_usage(
                trace_id,
                int(prompt_tok),
                int(comp_tok),
                int(prompt_tok) + int(comp_tok),
            )

            if mode == "clarify":
                state["final_response"] = clean
                state["requires_clarification"] = True
                state["fallback_reason"] = None
                state["suggested_questions"] = clarify_options
                state["response_sources"] = []
                state["token_usage"] = token_usage
                state["generation_latency_ms"] = gen_latency_ms
                update_agent_execution(
                    state,
                    self.agent_id,
                    self.agent_name,
                    "completed",
                    {"query": query},
                    {
                        "response_length": len(clean),
                        "answer_source": answer_source,
                        "generation_latency_ms": round(gen_latency_ms, 1),
                        "total_tokens": token_usage["total_tokens"],
                        "requires_clarification": True,
                    },
                )
                return state

            state["final_response"] = clean
            state["requires_clarification"] = False
            state["fallback_reason"] = None
            state["suggested_questions"] = []
            state["response_sources"] = sources
            state["token_usage"] = token_usage
            state["generation_latency_ms"] = gen_latency_ms
            state["from_web_search_only"] = answer_source == "web"

            # Store in response cache. Clarify turns return above and never reach
            # here — the cache key has no session component, so caching a
            # clarifying question would leak it to unrelated sessions.
            q_hash = cache.compute_query_hash(
                state.get("original_query") or query,
                state.get("chatbot_id", ""),
            )
            await cache.set_response(
                q_hash,
                state.get("chatbot_id", ""),
                {
                    "final_response": clean,
                    "response_sources": sources,
                    "answer_source": answer_source,
                    "token_usage": token_usage,
                },
            )

            update_agent_execution(
                state,
                self.agent_id,
                self.agent_name,
                "completed",
                {"query": query},
                {
                    "response_length": len(clean),
                    "answer_source": answer_source,
                    "generation_latency_ms": round(gen_latency_ms, 1),
                    "total_tokens": token_usage["total_tokens"],
                },
            )

        except Exception as exc:
            logger.error("Response synthesis failed: %s", exc)
            if "safety" in str(exc).lower() or "blocked" in str(exc).lower():
                _set_fallback_response(state, query, "inappropriate")
            else:
                state["error"] = str(exc)
                _set_fallback_response(state, query, "search_error")
            update_agent_execution(
                state,
                self.agent_id,
                self.agent_name,
                "failed",
                {"query": query},
                error_message=str(exc),
            )

        return state
