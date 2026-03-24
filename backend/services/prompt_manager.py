"""
Prompt manager service for managing LLM prompts and templates.
"""
from typing import Dict, Any, Optional
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


class PromptManager:
    """Service for managing prompts for various agents and tasks."""

    def __init__(self):
        """Initialize the prompt manager."""
        self.prompts: Dict[str, str] = {}
        self._load_default_prompts()

        logger.info("Prompt manager initialized")

    def _load_default_prompts(self) -> None:
        """Load default prompt templates."""
        # Intent classification prompt
        self.prompts["intent_classifier"] = """Classify the following user query into one of these intents:
- DOCUMENT_SEARCH: Query asking about information from uploaded documents
- WEB_SEARCH: Query asking for current information, news, or general knowledge not in documents
- OCR: Query mentioning images or scanned documents
- URL_PROCESS: Query providing a URL to process
- COMPLEX: Query requiring multiple steps or combining multiple information sources

Query: {query}

Respond with only the intent name and confidence score (0-1) in format: INTENT|CONFIDENCE
Example: DOCUMENT_SEARCH|0.95
"""

        # Plan generation prompt
        self.prompts["plan_generator"] = """Generate an execution plan for this complex query.
Query: {query}
Intent: {intent}

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

        # Response synthesis prompt
        self.prompts["response_synthesis"] = """Based on the following context, answer the user's query.
Provide a comprehensive response with proper citations.

User Query: {query}

Context:
{context}

Instructions:
1. Answer the query based on the provided context
2. Cite sources using [Source N] notation
3. If the context doesn't contain enough information, say so
4. Be concise but thorough

Response:"""

        # Document summary prompt
        self.prompts["summarize"] = """Summarize the following text concisely:

{text}

Provide a 2-3 sentence summary that captures the main points.
"""

        # Web search query generation
        self.prompts["search_query"] = """Generate an optimized web search query for this user question:

User Question: {question}

Generate a search query that will find the most relevant and recent information.
Respond with only the search query.
"""

    def get_prompt(
        self,
        prompt_name: str,
        **kwargs
    ) -> str:
        """
        Get a prompt template and format it with parameters.

        Args:
            prompt_name: Name of the prompt template
            **kwargs: Parameters to format into the prompt

        Returns:
            Formatted prompt string
        """
        template = self.prompts.get(prompt_name, "")

        if not template:
            logger.warning(f"Prompt not found: {prompt_name}")
            return ""

        try:
            return template.format(**kwargs)
        except KeyError as e:
            logger.error(f"Missing parameter for prompt {prompt_name}: {e}")
            raise

    def add_prompt(
        self,
        name: str,
        template: str,
    ) -> None:
        """Add or update a prompt template."""
        self.prompts[name] = template
        logger.info(f"Added prompt: {name}")

    def list_prompts(self) -> list:
        """List all available prompt names."""
        return list(self.prompts.keys())


# Global prompt manager instance
_prompt_manager: Optional[PromptManager] = None


def get_prompt_manager() -> PromptManager:
    """Get or create the global prompt manager instance."""
    global _prompt_manager
    if _prompt_manager is None:
        _prompt_manager = PromptManager()
    return _prompt_manager
