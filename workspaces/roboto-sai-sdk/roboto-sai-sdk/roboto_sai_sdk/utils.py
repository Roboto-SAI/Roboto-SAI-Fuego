"""
Roboto SAI Python SDK — Exclusive Property of Roberto Villarreal Martinez
© 2026 Roberto Villarreal Martinez — All Rights Reserved Worldwide
"""

def get_emotion_from_message(message: str) -> str:
    message_lower = message.lower()
    if any(word in message_lower for word in ["angry", "rage", "furious", "hate"]):
        return "rage"
    elif any(word in message_lower for word in ["happy", "joy", "excited", "love"]):
        return "joy"
    elif any(word in message_lower for word in ["sad", "depressed", "cry"]):
        return "sadness"
    elif any(word in message_lower for word in ["scared", "fear", "afraid"]):
        return "fear"
    elif any(word in message_lower for word in ["surprised", "shocked", "wow"]):
        return "surprise"
    else:
        return "neutral"