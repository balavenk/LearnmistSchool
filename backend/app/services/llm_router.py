import os
import json
import asyncio
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod

# Try to import providers (they should be installed now)
try:
    from openai import AsyncOpenAI
    from openai import RateLimitError as OpenAIRateLimitError
    from openai import APIError as OpenAPIError
except ImportError:
    AsyncOpenAI = None

try:
    from anthropic import AsyncAnthropic
    from anthropic import RateLimitError as AnthropicRateLimitError
    from anthropic import APIError as AnthropicAPIError
except ImportError:
    AsyncAnthropic = None

try:
    import google.generativeai as genai
    from google.api_core.exceptions import ResourceExhausted, GoogleAPIError
except ImportError:
    genai = None


class BaseLLMProvider(ABC):
    """Abstract base class for LLM providers."""
    
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    async def generate_json(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """Generate a JSON response from the LLM."""
        pass


class OpenAIProvider(BaseLLMProvider):
    def __init__(self):
        self._client = None
        self.model = "gpt-4o"
        
    @property
    def name(self) -> str:
        return "OpenAI"

    def _get_client(self):
        if not self._client:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY not set")
            self._client = AsyncOpenAI(api_key=api_key)
        return self._client

    async def generate_json(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        client = self._get_client()
        try:
            completion = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"}
            )
            content = completion.choices[0].message.content
            return self._parse_json(content)
        except (OpenAIRateLimitError, OpenAPIError) as e:
            # We explicitly want to raise these so the router can catch them
            print(f"[OpenAIProvider] API Error: {e}")
            raise

    def _parse_json(self, content: str) -> Dict[str, Any]:
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Clean markdown
            cleaned = content.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            res = cleaned.strip()
            return json.loads(res) if res else {}


class ClaudeProvider(BaseLLMProvider):
    def __init__(self):
        self._client = None
        self.model = "claude-3-5-sonnet-20241022"
        
    @property
    def name(self) -> str:
        return "Claude"

    def _get_client(self):
        if not AsyncAnthropic:
            raise ImportError("anthropic package not installed")
        if not self._client:
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY not set")
            self._client = AsyncAnthropic(api_key=api_key)
        return self._client

    async def generate_json(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        client = self._get_client()
        # Claude doesn't have a strict JSON mode like OpenAI in all models, 
        # but system prompts + prefilling Assistant response works well.
        full_system = f"{system_prompt}\n\nYou must respond ONLY with valid, raw JSON."
        try:
            response = await client.messages.create(
                model=self.model,
                max_tokens=4000,
                system=full_system,
                messages=[
                    {"role": "user", "content": user_prompt},
                    {"role": "assistant", "content": "{"} # Prefill to force JSON start
                ]
            )
            content = "{" + response.content[0].text
            return self._parse_json(content)
        except (AnthropicRateLimitError, AnthropicAPIError) as e:
            print(f"[ClaudeProvider] API Error: {e}")
            raise

    def _parse_json(self, content: str) -> Dict[str, Any]:
        try:
            return json.loads(content)
        except Exception:
             # Basic cleanup
             import re
             pattern = r'```(?:json)?(.*?)```'
             matches = re.findall(pattern, content, re.DOTALL)
             if matches:
                 try:
                     return json.loads(matches[0].strip())
                 except: 
                     pass
             raise ValueError("Failed to parse JSON from Claude response")


class GeminiProvider(BaseLLMProvider):
    def __init__(self):
        self._initialized = False
        self.model_name = "gemini-1.5-flash"
        self._model = None
        
    @property
    def name(self) -> str:
        return "Gemini"

    def _init_client(self):
        if not genai:
            raise ImportError("google-generativeai package not installed")
        if not self._initialized:
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise ValueError("GEMINI_API_KEY not set")
            genai.configure(api_key=api_key)
            # Use gemini-1.5 with JSON capability
            self._model = genai.GenerativeModel(
                self.model_name,
                generation_config={"response_mime_type": "application/json"}
            )
            self._initialized = True

    async def generate_json(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        self._init_client()
        prompt = f"System Instructions:\n{system_prompt}\n\nUser Prompt:\n{user_prompt}"
        
        try:
            # Note: The python sdk for gemini generation is synchronous by default unless using async client, 
            # We use generate_content_async.
            response = await self._model.generate_content_async(prompt)
            return json.loads(response.text)
        except (ResourceExhausted, GoogleAPIError) as e:
             print(f"[GeminiProvider] API Error: {e}")
             raise
        except Exception as e:
            print(f"[GeminiProvider] Unexpected error: {e}")
            raise


class LLMRouter:
    """
    Routes LLM requests through a priority chain of providers,
    falling back if quotas or errors occur.
    """
    def __init__(self):
        # Order of fallback: OpenAI -> Claude -> Gemini
        self.providers: list[BaseLLMProvider] = [
            OpenAIProvider(),
            ClaudeProvider(),
            GeminiProvider()
        ]

    async def generate_json(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        last_error = None
        for provider in self.providers:
            print(f"[LLMRouter] Attempting generation with {provider.name}...")
            try:
                result = await provider.generate_json(system_prompt, user_prompt)
                print(f"[LLMRouter] Success with {provider.name}.")
                return result
            except ValueError as ve:
                # E.g., API key not set. Skip to next provider.
                print(f"[LLMRouter] Skipping {provider.name}: {ve}")
                last_error = ve
                continue
            except Exception as e:
                 # Rate limits, timeouts, API errors
                 print(f"[LLMRouter] Error with {provider.name}, falling back... Error: {str(e)}")
                 last_error = e
                 continue
                 
        # If we got here, all providers failed
        raise RuntimeError(f"All LLM providers failed. Last error: {last_error}")

# Global singleton router
router = LLMRouter()
