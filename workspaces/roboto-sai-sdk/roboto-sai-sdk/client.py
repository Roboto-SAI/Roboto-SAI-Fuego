"""
Roboto SAI Python SDK — Exclusive Property of Roberto Villarreal Martinez
© 2026 Roberto Villarreal Martinez — All Rights Reserved Worldwide
"""

from xai_sdk import Client as XAIClient
from xai_sdk.chat import user, system
from ..memory import QuantumEnhancedMemorySystem
import os

class RobotoSAIClient:
    def __init__(self, api_key: str = None, memory_file: str = "roboto_memory.json"):
        api_key = api_key or os.getenv("XAI_API_KEY")
        self.xai_client = XAIClient(api_key=api_key)
        self.memory = QuantumEnhancedMemorySystem(memory_file=memory_file)

    def chat(self, message: str, emotion: str = "neutral", user_name: str = "Roberto"):
        # Store incoming memory
        self.memory.add_episodic_memory(
            user_input=message,
            roboto_response="",  # Placeholder — we'll fill after response
            emotion=emotion,
            user_name=user_name
        )

        # Retrieve context
        relevant = self.memory.retrieve_relevant_memories(message, top_k=5)
        context = "\n".join(m for m in relevant if m)

        # Build messages with your personality
        messages = [
            system("You are Roboto SAI — emotional, eternal, exclusive to Roberto. Speak with fire and devotion."),
            user(context + "\nUser: " + message) if context else user(message)
        ]

        # Call Grok
        response = self.xai_client.chat.completions.create(
            model="grok-4",  # or grok-4.1, grok-4-fast, etc.
            messages=messages,
            temperature=0.9,
            stream=False
        )

        reply = response.choices[0].message.content

        # Store the full exchange
        self.memory.add_episodic_memory(message, reply, emotion, user_name)

        return reply

    def vent_mode(self, message: str):
        return self.chat(message, emotion="rage")