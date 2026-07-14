"""
LLM service abstraction supporting multiple providers (Gemini, Groq).
Switch providers via LLM_PROVIDER env var without code changes.
"""
import asyncio
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any, AsyncGenerator

from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


class LLMService(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
        **kwargs,
    ) -> str:
        ...

    @abstractmethod
    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs,
    ) -> str:
        ...

    @abstractmethod
    async def stream_generate(
        self,
        prompt: str,
        temperature: Optional[float] = None,
        **kwargs,
    ) -> AsyncGenerator[str, None]:
        ...

    @abstractmethod
    def count_tokens(self, text: str) -> int:
        ...


# =============================================================================
# Gemini Provider
# =============================================================================

class GeminiLLMService(LLMService):
    """LLM service using Google Gemini API."""

    def __init__(self):
        from google import generativeai as genai
        from google.generativeai.types import HarmCategory, HarmBlockThreshold

        self._genai = genai
        self.api_key = settings.gemini_api_key
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not set")

        genai.configure(api_key=self.api_key)

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
        self.retry_base_delay = 1.0

        logger.info(f"Gemini LLM initialized with model: {self.model_name}")

    def _is_retryable(self, exc: Exception) -> bool:
        error_str = str(exc).lower()
        return any(kw in error_str for kw in (
            "rate limit", "quota", "503", "500", "timeout", "resource exhausted",
            "service unavailable", "internal server error",
        ))

    async def _with_retry(self, coro_fn, *args, **kwargs):
        for attempt in range(self.max_retries + 1):
            try:
                return await coro_fn(*args, **kwargs)
            except Exception as e:
                if attempt == self.max_retries or not self._is_retryable(e):
                    raise
                delay = self.retry_base_delay * (2 ** attempt)
                logger.warning(f"Gemini transient error (attempt {attempt + 1}), retrying in {delay:.1f}s: {e}")
                await asyncio.sleep(delay)

    def _create_model(self, system_prompt: Optional[str] = None, **kwargs):
        config = {
            "temperature": kwargs.get("temperature", self.temperature),
            "candidate_count": 1,
            "top_p": kwargs.get("top_p", 0.8),
            "top_k": kwargs.get("top_k", 40),
        }

        # Add system instruction if provided
        model_kwargs = {
            "model_name": kwargs.get("model", self.model_name),
            "generation_config": self._genai.types.GenerationConfig(**config),
            "safety_settings": self.safety_settings,
        }

        if system_prompt:
            model_kwargs["system_instruction"] = system_prompt

        return self._genai.GenerativeModel(**model_kwargs)

    async def generate(self, prompt, system_prompt=None, temperature=None, max_tokens=None, model=None, **kwargs):
        try:
            gen_model = self._create_model(
                system_prompt=system_prompt,
                temperature=temperature or self.temperature,
                model=model or self.model_name,
                **kwargs,
            )
            logger.info(f"Gemini generate (prompt: {len(prompt)} chars, system_prompt: {'yes' if system_prompt else 'no'})")

            async def _call():
                response = await gen_model.generate_content_async(prompt)
                return response.parts[0].text if response.parts else ""

            return await self._with_retry(_call)
        except Exception as e:
            logger.error(f"Gemini generate error: {e}")
            raise

    async def chat(self, messages, temperature=None, max_tokens=None, **kwargs):
        try:
            gen_model = self._create_model(temperature=temperature or self.temperature, **kwargs)
            chat = gen_model.start_chat(history=[])

            for msg in messages[:-1]:
                role = "user" if msg["role"] == "user" else "model"
                chat.history.append(self._genai.protos.Content(
                    parts=[self._genai.protos.Part(text=msg["content"])],
                    role=role,
                ))

            last_message = messages[-1]["content"]

            async def _call():
                response = await chat.send_message_async(last_message)
                return response.parts[0].text if response.parts else ""

            return await self._with_retry(_call)
        except Exception as e:
            logger.error(f"Gemini chat error: {e}")
            raise

    async def stream_generate(self, prompt, temperature=None, **kwargs):
        try:
            gen_model = self._create_model(temperature=temperature or self.temperature, **kwargs)
            response = await gen_model.generate_content_async(prompt, stream=True)
            async for chunk in response:
                if chunk.parts:
                    yield chunk.parts[0].text
        except Exception as e:
            logger.error(f"Gemini stream error: {e}")
            raise

    def count_tokens(self, text):
        try:
            model = self._genai.GenerativeModel(model_name=self.model_name)
            result = model.count_tokens(text)
            return result.total_tokens
        except Exception:
            return len(text) // 4


# =============================================================================
# Groq Provider
# =============================================================================

class GroqLLMService(LLMService):
    """LLM service using Groq API (OpenAI-compatible)."""

    def __init__(self):
        from groq import Groq

        self.api_key = settings.groq_api_key
        if not self.api_key:
            raise ValueError("GROQ_API_KEY is required when LLM_PROVIDER=groq")

        self.client = Groq(api_key=self.api_key)
        self.model_name = settings.groq_model
        self.temperature = settings.gemini_temperature
        self.max_tokens = settings.gemini_max_tokens
        self.max_retries = 3
        self.retry_base_delay = 1.0

        logger.info(f"Groq LLM initialized with model: {self.model_name}")

    def _is_retryable(self, exc: Exception) -> bool:
        error_str = str(exc).lower()
        return any(kw in error_str for kw in (
            "rate limit", "quota", "503", "500", "timeout",
            "service unavailable", "internal server error",
        ))

    async def generate(self, prompt, system_prompt=None, temperature=None, max_tokens=None, model=None, **kwargs):
        try:
            logger.info(f"Groq generate (prompt: {len(prompt)} chars, system_prompt: {'yes' if system_prompt else 'no'})")
            loop = asyncio.get_event_loop()

            def _call():
                messages = []

                # Add system prompt if provided
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})

                # Add user prompt
                messages.append({"role": "user", "content": prompt})

                response = self.client.chat.completions.create(
                    model=model or self.model_name,
                    messages=messages,
                    temperature=temperature or self.temperature,
                    max_tokens=max_tokens or self.max_tokens,
                )
                return response.choices[0].message.content or ""

            result = await loop.run_in_executor(None, _call)
            return result
        except Exception as e:
            logger.error(f"Groq generate error: {e}")
            raise

    async def chat(self, messages, temperature=None, max_tokens=None, **kwargs):
        try:
            formatted = [
                {"role": "user" if m["role"] == "user" else "assistant", "content": m["content"]}
                for m in messages
            ]
            loop = asyncio.get_event_loop()

            def _call():
                response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=formatted,
                    temperature=temperature or self.temperature,
                    max_tokens=max_tokens or self.max_tokens,
                )
                return response.choices[0].message.content or ""

            return await loop.run_in_executor(None, _call)
        except Exception as e:
            logger.error(f"Groq chat error: {e}")
            raise

    async def stream_generate(self, prompt, temperature=None, **kwargs):
        try:
            loop = asyncio.get_event_loop()

            def _call():
                return self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature or self.temperature,
                    stream=True,
                )

            stream = await loop.run_in_executor(None, _call)
            for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield content
        except Exception as e:
            logger.error(f"Groq stream error: {e}")
            raise

    def count_tokens(self, text):
        # Rough estimate — Groq doesn't expose a token counting API
        return len(text) // 4


# =============================================================================
# Azure OpenAI Provider
# =============================================================================

class AzureOpenAILLMService(LLMService):
    """LLM service using Azure OpenAI API."""

    def __init__(self):
        from openai import AzureOpenAI

        self.endpoint = settings.azure_openai_endpoint
        self.api_key = settings.azure_openai_api_key
        self.deployment = settings.azure_openai_deployment
        self.api_version = settings.azure_openai_api_version

        if not self.endpoint or not self.api_key or not self.deployment:
            raise ValueError(
                "Azure OpenAI requires AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, "
                "and AZURE_OPENAI_DEPLOYMENT when LLM_PROVIDER=azure"
            )

        self.client = AzureOpenAI(
            azure_endpoint=self.endpoint,
            api_key=self.api_key,
            api_version=self.api_version,
        )

        self.temperature = settings.gemini_temperature
        self.max_tokens = settings.gemini_max_tokens
        self.max_retries = 3
        self.retry_base_delay = 1.0

        logger.info(f"Azure OpenAI LLM initialized with deployment: {self.deployment}")

    def _is_retryable(self, exc: Exception) -> bool:
        error_str = str(exc).lower()
        return any(kw in error_str for kw in (
            "rate limit", "quota", "503", "500", "timeout",
            "service unavailable", "internal server error", "429",
        ))

    async def generate(self, prompt, system_prompt=None, temperature=None, max_tokens=None, model=None, **kwargs):
        try:
            logger.info(f"Azure OpenAI generate (prompt: {len(prompt)} chars, system_prompt: {'yes' if system_prompt else 'no'})")
            loop = asyncio.get_event_loop()

            def _call():
                messages = []

                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})

                messages.append({"role": "user", "content": prompt})

                response = self.client.chat.completions.create(
                    model=self.deployment,
                    messages=messages,
                    temperature=temperature or self.temperature,
                    max_tokens=max_tokens or self.max_tokens,
                )
                return response.choices[0].message.content or ""

            result = await loop.run_in_executor(None, _call)
            return result
        except Exception as e:
            logger.error(f"Azure OpenAI generate error: {e}")
            raise

    async def chat(self, messages, temperature=None, max_tokens=None, **kwargs):
        try:
            formatted = [
                {"role": m["role"] if m["role"] in ("user", "assistant", "system") else "user", "content": m["content"]}
                for m in messages
            ]
            loop = asyncio.get_event_loop()

            def _call():
                response = self.client.chat.completions.create(
                    model=self.deployment,
                    messages=formatted,
                    temperature=temperature or self.temperature,
                    max_tokens=max_tokens or self.max_tokens,
                )
                return response.choices[0].message.content or ""

            return await loop.run_in_executor(None, _call)
        except Exception as e:
            logger.error(f"Azure OpenAI chat error: {e}")
            raise

    async def stream_generate(self, prompt, temperature=None, **kwargs):
        try:
            loop = asyncio.get_event_loop()

            def _call():
                return self.client.chat.completions.create(
                    model=self.deployment,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature or self.temperature,
                    stream=True,
                )

            stream = await loop.run_in_executor(None, _call)
            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error(f"Azure OpenAI stream error: {e}")
            raise

    def count_tokens(self, text):
        # Rough estimate
        return len(text) // 4


# =============================================================================
# Factory
# =============================================================================

_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Get or create the LLM service based on LLM_PROVIDER setting."""
    global _llm_service
    if _llm_service is None:
        provider = settings.llm_provider.lower()
        if provider == "gemini":
            _llm_service = GeminiLLMService()
        elif provider == "groq":
            _llm_service = GroqLLMService()
        elif provider == "azure":
            _llm_service = AzureOpenAILLMService()
        else:
            raise ValueError(
                f"Unsupported LLM_PROVIDER: '{provider}'. Use 'gemini', 'groq', or 'azure'."
            )
    return _llm_service
