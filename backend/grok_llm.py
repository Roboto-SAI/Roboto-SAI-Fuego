"""
Grok LLM wrapper for LangChain integration.
Adapts Roboto SAI SDK to LangChain's LLM interface.
"""

from typing import Any, List, Optional, AsyncIterator
from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.language_models import LLM
from langchain_core.outputs import Generation, LLMResult
from langchain_core.pydantic_v1 import Field
from langchain_core.messages import BaseMessage, HumanMessage

from roboto_sai_sdk import get_xai_grok


class GrokLLM(LLM):
    """
    LangChain LLM wrapper for xAI Grok via Roboto SAI SDK.
    """

    client: Any = Field(default=None, description="Roboto SAI client instance")
    model_name: str = Field(default="grok", description="Model name")
    reasoning_effort: Optional[str] = Field(default="high", description="Reasoning effort level")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.client is None:
            self.client = get_xai_grok()

    @property
    def _llm_type(self) -> str:
        return "grok"

    def _call(
        self,
        prompt: str | List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        """
        Synchronous call to Grok.
        """
        import asyncio
        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(self._acall(prompt, stop, run_manager, **kwargs))
            return result
        finally:
            loop.close()

    async def _acall(
        self,
        prompt: str | List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        """
        Async call to Grok for better performance.
        """
        if not self.client or not self.client.available:
            raise ValueError("Grok client not available")

        # Handle input
        if isinstance(prompt, str):
            user_message = prompt
            context = kwargs.get("context", "")
        elif isinstance(prompt, list):
            # Extract last human message as the new input
            messages = prompt
            last_human = None
            context_parts = []
            for msg in messages[:-1]:  # All except last
                role = "User" if isinstance(msg, HumanMessage) else "Assistant"
                context_parts.append(f"{role}: {msg.content}")
            context = "\n".join(context_parts)
            last_msg = messages[-1]
            user_message = last_msg.content if hasattr(last_msg, 'content') else str(last_msg)
        else:
            user_message = str(prompt)
            context = kwargs.get("context", "")

        # Extract history or emotion from kwargs
        if isinstance(prompt, list) and prompt:
            last_msg = prompt[-1]
            if hasattr(last_msg, 'additional_kwargs'):
                # Use emotion in context
                emotion = last_msg.additional_kwargs.get("emotion_text", "")
                if emotion:
                    context += f"\nUser Emotion: {emotion}"

        # Prepare roboto context
        roboto_context = context if context else None

        try:
            result = await self.client.roboto_grok_chat(
                user_message=user_message,
                roboto_context=roboto_context,
            )

            if result.get("success"):
                response = result.get("response", "")
                # Apply stop sequences if provided
                if stop:
                    for stop_seq in stop:
                        if stop_seq in response:
                            response = response.split(stop_seq)[0]
                            break
                return response
            else:
                error = result.get("error", "Unknown error")
                raise RuntimeError(f"Grok API error: {error}")

        except Exception as e:
            raise RuntimeError(f"Grok call failed: {e}")

    @property
    def _identifying_params(self) -> dict:
        return {
            "model_name": self.model_name,
            "reasoning_effort": self.reasoning_effort,
        }

    def _generate(
        self,
        prompts: List[str] | List[List[BaseMessage]],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> LLMResult:
        """Generate completions for multiple prompts."""
        generations = []
        for prompt in prompts:
            response = self._call(prompt, stop=stop, run_manager=run_manager, **kwargs)
            generations.append([Generation(text=response)])

        return LLMResult(generations=generations)