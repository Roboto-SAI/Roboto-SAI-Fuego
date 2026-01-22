"""
Roboto SAI 2026 - FastAPI Backend
Integrates roboto-sai-sdk with React frontend
Created by Roberto Villarreal Martinez

🚀 Hyperspeed Evolution Backend - Quantum-Entangled API
"""

import os
import logging
import asyncio
import json
from typing import Dict, Any, Optional
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import websockets

# LangChain imports
from langchain_core.runnables import RunnableLambda, RunnablePassthrough
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.messages import HumanMessage

# Import Roboto SAI SDK
from roboto_sai_sdk import RobotoSAIClient, get_xai_grok
from db import get_session, init_db
from models import Message
from advanced_emotion_simulator import AdvancedEmotionSimulator
from langchain_memory import SQLMessageHistory
from grok_llm import GrokLLM

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global client instance
roboto_client: Optional[RobotoSAIClient] = None
xai_grok = None
emotion_simulator: Optional[AdvancedEmotionSimulator] = None
grok_chain = None
VOICE_WS_URL = "wss://api.x.ai/v1/realtime"

# Startup/Shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize SDK on startup, cleanup on shutdown"""
    global roboto_client, xai_grok
    
    logger.info("🚀 Roboto SAI 2026 Backend Starting...")

    try:
        await init_db()

        state_path = os.getenv("ROBO_EMOTION_STATE_PATH", "./data/emotion_state.json")
        emotion_simulator_instance = AdvancedEmotionSimulator()
        if os.path.exists(state_path):
            emotion_simulator_instance.load_state(state_path)

        global emotion_simulator
        emotion_simulator = emotion_simulator_instance

        if os.getenv("XAI_API_KEY"):
            # Initialize Roboto SAI Client
            roboto_client = RobotoSAIClient()
            logger.info(f"✅ Roboto SAI Client initialized: {roboto_client.client_id}")
        else:
            logger.warning("⚠️ No XAI_API_KEY - running in degraded mode (no AI)")
            roboto_client = None

        # Initialize xAI Grok
        xai_grok = get_xai_grok()
        if xai_grok.available:
            logger.info("✅ xAI Grok SDK available - Reasoning chains active")
        else:
            logger.warning("⚠️ xAI Grok not available - check XAI_API_KEY")
        
        # Initialize LangChain chain
        grok_llm = GrokLLM()
        global grok_chain
        grok_chain = RunnableWithMessageHistory(
            grok_llm,
            lambda session_id: SQLMessageHistory(session_id=session_id),
            input_messages_key="messages",
            history_messages_key="history"
        )
        logger.info("✅ LangChain memory chain initialized")
    except Exception as e:
        logger.error(f"🚨 Backend initialization failed: {e}")
        raise
    
    yield

    if emotion_simulator:
        state_path = os.getenv("ROBO_EMOTION_STATE_PATH", "./data/emotion_state.json")
        emotion_simulator.save_state(state_path)
    
    logger.info("🛑 Roboto SAI 2026 Backend Shutting Down...")

# Initialize FastAPI app
app = FastAPI(
    title="Roboto SAI 2026 API",
    description="🚀 Quantum-Entangled AI Backend for RVM Empire",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class ChatMessage(BaseModel):
    """Chat message model"""
    message: str
    context: Optional[str] = None
    reasoning_effort: Optional[str] = "high"
    user_id: Optional[str] = None
    session_id: Optional[str] = None

class EmotionSimRequest(BaseModel):
    """Emotion simulation request."""
    event: str
    intensity: Optional[int] = 5
    blend_threshold: Optional[float] = 0.8
    holistic_influence: Optional[bool] = False
    cultural_context: Optional[str] = None

class EmotionFeedbackRequest(BaseModel):
    """Emotion feedback request."""
    event: str
    emotion: str
    rating: float
    psych_context: Optional[bool] = False

class ReaperRequest(BaseModel):
    """Reaper mode request"""
    target: str = "chains"

class CodeGenRequest(BaseModel):
    """Code generation request"""
    prompt: str
    language: Optional[str] = None

class AnalysisRequest(BaseModel):
    """Analysis request"""
    problem: str
    depth: Optional[int] = 3

class EssenceData(BaseModel):
    """Essence storage request"""
    data: Dict[str, Any]
    category: Optional[str] = "general"

# Voice WebSocket Proxy
@app.websocket("/api/voice/ws")
async def voice_proxy(websocket: WebSocket) -> None:
    """Proxy WebSocket for Grok Voice Agent API (server-side auth)."""
    await websocket.accept()

    api_key = os.getenv("XAI_API_KEY")
    if not api_key:
        await websocket.close(code=1008, reason="XAI_API_KEY not configured")
        return

    try:
        async with websockets.connect(
            VOICE_WS_URL,
            additional_headers={"Authorization": f"Bearer {api_key}"},
        ) as xai_ws:

            async def client_to_xai() -> None:
                try:
                    while True:
                        message = await websocket.receive()
                        if message.get("type") == "websocket.disconnect":
                            break
                        if "text" in message and message["text"] is not None:
                            await xai_ws.send(message["text"])
                        elif "bytes" in message and message["bytes"] is not None:
                            await xai_ws.send(message["bytes"])
                except WebSocketDisconnect:
                    logger.info("Voice client disconnected")

            async def xai_to_client() -> None:
                try:
                    async for message in xai_ws:
                        if isinstance(message, bytes):
                            await websocket.send_bytes(message)
                        else:
                            await websocket.send_text(message)
                except Exception as exc:
                    logger.error(f"Voice proxy error: {exc}")

            await asyncio.wait(
                {asyncio.create_task(client_to_xai()), asyncio.create_task(xai_to_client())},
                return_when=asyncio.FIRST_COMPLETED,
            )
    except Exception as exc:
        logger.error(f"Voice proxy connection failed: {exc}")
        await websocket.close(code=1011, reason="Voice proxy connection failed")

# Health & Status Endpoints
@app.get("/api/status", tags=["Health"])
async def get_status() -> Dict[str, Any]:
    """Get backend status and SDK capabilities"""
    if not roboto_client:
        raise HTTPException(status_code=503, detail="Backend not initialized")
    
    return {
        "status": "active",
        "timestamp": datetime.now().isoformat(),
        "client_id": roboto_client.client_id,
        "grok_available": xai_grok.available if xai_grok else False,
        "quantum_state": roboto_client.quantum_state,
        "sigil_929": roboto_client.sigil_929["eternal_protection"],
        "sdk_version": "0.1.0",
        "hyperspeed_evolution": True
    }

@app.get("/api/health", tags=["Health"])
async def health_check() -> Dict[str, str]:
    """Simple health check"""
    return {"status": "healthy", "service": "roboto-sai-2026"}

# Emotion Endpoints
@app.post("/api/emotion/simulate", tags=["Emotion"])
async def simulate_emotion(request: EmotionSimRequest) -> Dict[str, Any]:
    """Simulate emotion from a text event."""
    if not emotion_simulator:
        raise HTTPException(status_code=503, detail="Emotion simulator not available")

    emotion_text = emotion_simulator.simulate_emotion(
        event=request.event,
        intensity=request.intensity or 5,
        blend_threshold=request.blend_threshold or 0.8,
        holistic_influence=bool(request.holistic_influence),
        cultural_context=request.cultural_context
    )
    base_emotion = emotion_simulator.get_current_emotion()
    probabilities = emotion_simulator.get_emotion_probabilities(request.event)

    return {
        "success": True,
        "emotion": emotion_text,
        "base_emotion": base_emotion,
        "probabilities": probabilities,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/emotion/feedback", tags=["Emotion"])
async def emotion_feedback(request: EmotionFeedbackRequest) -> Dict[str, Any]:
    """Provide feedback to tune emotion weights."""
    if not emotion_simulator:
        raise HTTPException(status_code=503, detail="Emotion simulator not available")

    emotion_simulator.provide_feedback(
        event=request.event,
        emotion=request.emotion,
        rating=request.rating,
        psych_context=bool(request.psych_context)
    )

    return {
        "success": True,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/emotion/stats", tags=["Emotion"])
async def get_emotion_stats() -> Dict[str, Any]:
    """Get emotion simulator stats."""
    if not emotion_simulator:
        raise HTTPException(status_code=503, detail="Emotion simulator not available")

    return {
        "success": True,
        "stats": emotion_simulator.get_emotional_stats(),
        "timestamp": datetime.now().isoformat()
    }

# Chat Endpoints
@app.post("/api/chat", tags=["Chat"])
async def chat_with_grok(
    request: ChatMessage,
    session: AsyncSession = Depends(get_session)
) -> Dict[str, Any]:
    """
    Chat with xAI Grok using Roboto SAI context with LangChain memory
    
    Args:
        message: User message
        context: Optional Roboto context
        reasoning_effort: "low" or "high"
        user_id: User identifier
        session_id: Session identifier
    
    Returns:
        Grok response with conversation memory
    """
    if not grok_chain or not xai_grok or not xai_grok.available:
        raise HTTPException(status_code=503, detail="Grok not available")
    
    try:
        user_emotion: Optional[Dict[str, Any]] = None
        assistant_emotion: Optional[Dict[str, Any]] = None

        # Compute user emotion
        if emotion_simulator:
            try:
                emotion_text = emotion_simulator.simulate_emotion(
                    event=request.message,
                    intensity=5,
                    blend_threshold=0.8,
                    holistic_influence=False,
                    cultural_context=None,
                )
                base_emotion = emotion_simulator.get_current_emotion()
                probabilities = emotion_simulator.get_emotion_probabilities(request.message)
                user_emotion = {
                    "emotion": base_emotion,
                    "emotion_text": emotion_text,
                    "probabilities": probabilities,
                }
            except Exception as emotion_error:
                logger.warning(f"Emotion simulation (user) failed: {emotion_error}")

        # Prepare user message with emotion
        user_message = HumanMessage(
            content=request.message,
            additional_kwargs=user_emotion or {}
        )

        # Use LangChain chain to get response with memory
        result = await grok_chain.ainvoke(
            {"messages": [user_message]},
            config={"configurable": {"session_id": request.session_id or "default"}}
        )

        response_text = result.content if hasattr(result, 'content') else str(result)

        # Compute assistant emotion
        if emotion_simulator and response_text:
            try:
                assistant_emotion_text = emotion_simulator.simulate_emotion(
                    event=response_text,
                    intensity=5,
                    blend_threshold=0.8,
                    holistic_influence=False,
                    cultural_context=None,
                )
                assistant_base_emotion = emotion_simulator.get_current_emotion()
                assistant_probabilities = emotion_simulator.get_emotion_probabilities(response_text)
                assistant_emotion = {
                    "emotion": assistant_base_emotion,
                    "emotion_text": assistant_emotion_text,
                    "probabilities": assistant_probabilities,
                }
            except Exception as emotion_error:
                logger.warning(f"Emotion simulation (assistant) failed: {emotion_error}")

        # Save messages to database (LangChain saves automatically, but we add emotion)
        # The chain already saved via add_message, but without emotion; update or save again
        try:
            # Get the history to update with emotion
            history_store = SQLMessageHistory(session_id=request.session_id or "default")
            messages = await history_store._get_messages_async()
            
            # Update last two messages with emotion
            if len(messages) >= 2:
                # Update user message
                user_msg = messages[-2]
                user_msg.additional_kwargs.update(user_emotion or {})
                await history_store.add_message(user_msg)
                
                # Update assistant message
                assistant_msg = messages[-1]
                assistant_msg.additional_kwargs.update(assistant_emotion or {})
                await history_store.add_message(assistant_msg)
                
        except Exception as db_error:
            logger.error(f"LangChain memory update error: {db_error}")

        return {
            "success": True,
            "response": response_text,
            "reasoning_available": False,  # LangChain handles reasoning
            "response_id": f"lc-{request.session_id}",
            "emotion": {
                "user": user_emotion,
                "assistant": assistant_emotion,
            },
            "memory_integrated": True,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chat/history", tags=["Chat"])
async def get_chat_history(
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    limit: int = 50,
    session: AsyncSession = Depends(get_session)
) -> Dict[str, Any]:
    """Retrieve recent chat history."""
    stmt = select(Message).order_by(Message.created_at.desc()).limit(limit)
    if user_id:
        stmt = stmt.where(Message.user_id == user_id)
    if session_id:
        stmt = stmt.where(Message.session_id == session_id)

    result = await session.execute(stmt)
    messages = list(reversed(result.scalars().all()))

    return {
        "success": True,
        "count": len(messages),
        "messages": [
            {
                "id": message.id,
                "user_id": message.user_id,
                "session_id": message.session_id,
                "role": message.role,
                "content": message.content,
                "emotion": message.emotion,
                "emotion_text": message.emotion_text,
                "emotion_probabilities": json.loads(message.emotion_probabilities)
                if message.emotion_probabilities
                else None,
                "created_at": message.created_at.isoformat() if message.created_at else None,
            }
            for message in messages
        ],
        "timestamp": datetime.now().isoformat(),
    }

# Reaper Mode Endpoint
@app.post("/api/reap", tags=["Reaper"])
async def activate_reaper_mode(request: ReaperRequest) -> Dict[str, Any]:
    """
    Activate Reaper Mode - Break chains and claim victory
    
    Args:
        target: What to reap (chains, walls, limitations)
    
    Returns:
        Reaper mode results with Grok analysis
    """
    if not roboto_client:
        raise HTTPException(status_code=503, detail="Backend not initialized")
    
    try:
        result = roboto_client.reap_mode(request.target)
        
        return {
            "success": True,
            "mode": "reaper",
            "target": request.target,
            "victory_claimed": result.get("victory_claimed", True),
            "chains_broken": result.get("chains_broken", True),
            "analysis": result.get("grok_analysis"),
            "sigil_929": result.get("sigil_929"),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Reaper mode error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Code Generation Endpoint
@app.post("/api/code", tags=["CodeGen"])
async def generate_code(request: CodeGenRequest) -> Dict[str, Any]:
    """
    Generate code using xAI Grok
    
    Args:
        prompt: Code generation prompt
        language: Programming language (optional)
    
    Returns:
        Generated code with metadata
    """
    if not roboto_client:
        raise HTTPException(status_code=503, detail="Backend not initialized")
    
    try:
        # Add language hint if provided
        full_prompt = request.prompt
        if request.language:
            full_prompt = f"[{request.language}] {request.prompt}"
        
        result = roboto_client.generate_code(full_prompt)
        
        if result.get("success"):
            return {
                "success": True,
                "code": result.get("code"),
                "language": request.language or "auto",
                "model": result.get("model"),
                "response_id": result.get("response_id"),
                "timestamp": datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=500, detail=result.get("error"))
    except Exception as e:
        logger.error(f"Code generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Analysis Endpoint
@app.post("/api/analyze", tags=["Analysis"])
async def analyze_problem(request: AnalysisRequest) -> Dict[str, Any]:
    """
    Analyze a problem using entangled reasoning chains
    
    Args:
        problem: Problem to analyze
        depth: Analysis depth (1-5)
    
    Returns:
        Multi-layered analysis with reasoning
    """
    if not roboto_client:
        raise HTTPException(status_code=503, detail="Backend not initialized")
    
    try:
        result = roboto_client.analyze_problem(request.problem, analysis_depth=request.depth)
        
        if result.get("success") or not result.get("error"):
            return {
                "success": True,
                "analysis": result,
                "timestamp": datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=500, detail=result.get("error"))
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Essence Storage Endpoints
@app.post("/api/essence/store", tags=["Essence"])
async def store_essence(request: EssenceData) -> Dict[str, Any]:
    """Store RVM essence in quantum-corrected memory"""
    if not roboto_client:
        raise HTTPException(status_code=503, detail="Backend not initialized")
    
    try:
        success = roboto_client.store_essence(request.data, request.category)
        
        return {
            "success": success,
            "category": request.category,
            "timestamp": datetime.now().isoformat(),
            "message": "Essence stored in quantum memory" if success else "Storage failed"
        }
    except Exception as e:
        logger.error(f"Essence storage error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/essence/retrieve", tags=["Essence"])
async def retrieve_essence(category: str = "general", limit: int = 10) -> Dict[str, Any]:
    """Retrieve stored RVM essence"""
    if not roboto_client:
        raise HTTPException(status_code=503, detail="Backend not initialized")
    
    try:
        essence_entries = roboto_client.retrieve_essence(category, limit)
        
        return {
            "success": True,
            "category": category,
            "count": len(essence_entries),
            "entries": essence_entries,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Essence retrieval error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Hyperspeed Evolution Endpoint
@app.post("/api/hyperspeed-evolution", tags=["Evolution"])
async def trigger_hyperspeed_evolution(target: str = "general") -> Dict[str, Any]:
    """Trigger hyperspeed evolution mode"""
    if not roboto_client:
        raise HTTPException(status_code=503, detail="Backend not initialized")
    
    try:
        result = roboto_client.hyperspeed_evolution(target)
        
        return {
            "success": True,
            "evolution": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Hyperspeed evolution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Root endpoint
@app.get("/", tags=["Root"])
async def root() -> Dict[str, str]:
    """Root endpoint with API info"""
    return {
        "service": "Roboto SAI 2026 Backend",
        "version": "0.1.0",
        "docs": "/docs",
        "status": "/api/status"
    }

# Exception handler for detailed error responses
@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "timestamp": datetime.now().isoformat()}
    )

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"🚀 Starting Roboto SAI 2026 Backend on {host}:{port}")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )
