"""
Gemini LLM service for text generation and chat completion.
"""
import os
import asyncio
from typing import Optional, List, Dict, Any
from google import generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


class GeminiService:
    """Service for interacting with Google Gemini API."""

    def __init__(self):
        """Initialize the Gemini service."""
        self.api_key = settings.gemini_api_key
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not set")

        genai.configure(api_key=self.api_key)

        # Configure safety settings
        self.safety_settings = {
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        }

        self.model_name = settings.gemini_model
        self.temperature = settings.gemini_temperature
        self.max_tokens = settings.gemini_max_tokens
        self.max_retries = 3
        self.retry_base_delay = 1.0  # seconds

        logger.info(f"Gemini service initialized with model: {self.model_name}")

    def _is_retryable(self, exc: Exception) -> bool:
        """Return True for transient errors that warrant a retry."""
        error_str = str(exc).lower()
        return any(kw in error_str for kw in (
            "rate limit", "quota", "503", "500", "timeout", "resource exhausted",
            "service unavailable", "internal server error",
        ))

    async def _with_retry(self, coro_fn, *args, **kwargs):
        """Run an async callable with exponential backoff on transient failures."""
        for attempt in range(self.max_retries + 1):
            try:
                return await coro_fn(*args, **kwargs)
            except Exception as e:
                if attempt == self.max_retries or not self._is_retryable(e):
                    raise
                delay = self.retry_base_delay * (2 ** attempt)
                logger.warning(
                    f"Gemini API transient error (attempt {attempt + 1}/{self.max_retries}), "
                    f"retrying in {delay:.1f}s: {e}"
                )
                await asyncio.sleep(delay)

    def _create_model(self, **kwargs):
        """Create a generative model instance."""
        config = {
            "temperature": kwargs.get("temperature", self.temperature),
            "candidate_count": 1,
            "top_p": kwargs.get("top_p", 0.8),
            "top_k": kwargs.get("top_k", 40),
        }

        model = genai.GenerativeModel(
            model_name=kwargs.get("model", self.model_name),
            generation_config=genai.types.GenerationConfig(**config),
            safety_settings=self.safety_settings,
        )

        return model

    async def generate(
        self,
        prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        Generate text using Gemini.

        Args:
            prompt: Input prompt
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            model: Model name override
            **kwargs: Additional generation parameters

        Returns:
            Generated text response
        """
        try:
            gen_model = self._create_model(
                temperature=temperature or self.temperature,
                model=model or self.model_name,
                **kwargs
            )

            logger.info(f"Calling Gemini API (prompt length: {len(prompt)})")

            async def _call():
                response = await gen_model.generate_content_async(prompt)
                return response.parts[0].text if response.parts else ""

            result = await self._with_retry(_call)

            logger.info(f"Gemini API response (length: {len(result)})")

            return result

        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
            raise

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> str:
        """
        Chat with Gemini using conversation history.

        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            **kwargs: Additional generation parameters

        Returns:
            Generated response
        """
        try:
            gen_model = self._create_model(
                temperature=temperature or self.temperature,
                **kwargs
            )

            # Start a chat session
            chat = gen_model.start_chat(history=[])

            # Build chat history
            for msg in messages[:-1]:
                if msg["role"] == "user":
                    chat.history.append(genai.protos.Content(
                        parts=[genai.protos.Part(text=msg["content"])],
                        role="user"
                    ))
                elif msg["role"] == "assistant":
                    chat.history.append(genai.protos.Content(
                        parts=[genai.protos.Part(text=msg["content"])],
                        role="model"
                    ))

            # Send the last message
            last_message = messages[-1]["content"]

            logger.info(f"Calling Gemini chat API (messages: {len(messages)})")

            async def _call():
                response = await chat.send_message_async(last_message)
                return response.parts[0].text if response.parts else ""

            result = await self._with_retry(_call)

            logger.info(f"Gemini chat API response (length: {len(result)})")

            return result

        except Exception as e:
            logger.error(f"Error in Gemini chat: {e}")
            raise

    async def stream_generate(
        self,
        prompt: str,
        temperature: Optional[float] = None,
        **kwargs
    ):
        """
        Stream generated text from Gemini.

        Args:
            prompt: Input prompt
            temperature: Sampling temperature
            **kwargs: Additional generation parameters

        Yields:
            Text chunks as they're generated
        """
        try:
            gen_model = self._create_model(
                temperature=temperature or self.temperature,
                **kwargs
            )

            logger.info("Starting Gemini stream generation")

            response = await gen_model.generate_content_async(
                prompt,
                stream=True
            )

            async for chunk in response:
                if chunk.parts:
                    yield chunk.parts[0].text

            logger.info("Gemini stream generation completed")

        except Exception as e:
            logger.error(f"Error in Gemini stream: {e}")
            raise

    def count_tokens(self, text: str) -> int:
        """
        Count tokens in text using Gemini's tokenizer.

        Args:
            text: Text to count tokens for

        Returns:
            Number of tokens
        """
        try:
            model = genai.GenerativeModel(model_name=self.model_name)
            result = model.count_tokens(text)
            return result.total_tokens
        except Exception as e:
            logger.error(f"Error counting tokens: {e}")
            # Rough estimate: ~4 characters per token
            return len(text) // 4


# Global singleton
_gemini_service: Optional["GeminiService"] = None


def get_gemini_service() -> "GeminiService":
    """Get or create the global Gemini service instance."""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
