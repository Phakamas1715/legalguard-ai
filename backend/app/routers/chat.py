"""Chat router — RAG-enhanced น้องซื่อสัตย์ chatbot endpoint."""
from __future__ import annotations

from __future__ import annotations

from typing import Optional, AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.services.chatbot_service import ChatRequest, ChatResponse, NongKotChatbot
from app.services.llm_service import stream_llm

router = APIRouter(prefix="/chat", tags=["chatbot"])

_chatbot: Optional[NongKotChatbot] = None


def _get_chatbot() -> NongKotChatbot:
    global _chatbot
    if _chatbot is None:
        _chatbot = NongKotChatbot()
    return _chatbot


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """RAG-enhanced chatbot endpoint for น้องซื่อสัตย์."""
    chatbot = _get_chatbot()
    return await chatbot.chat(request)


@router.post("/stream")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    """Streaming chat endpoint (SSE) — RAG context injected before LLM call.

    Flow: extract latest user message → RAG retrieval → prepend context
    to messages → stream_llm() for SSE output.
    Used for draft judgment in GovernmentDashboard.
    """
    chatbot = _get_chatbot()

    # Extract latest user message for RAG retrieval
    user_message = ""
    for msg in reversed(request.messages):
        if msg.role == "user":
            user_message = msg.content.strip()
            break

    # Build RAG-enriched message list
    rag_messages: list[dict] = []
    if user_message:
        rag_context = await chatbot.get_rag_context(user_message, request.role)
        if rag_context:
            # Inject context as the user turn, prepending retrieved docs
            enriched_content = f"ข้อมูลอ้างอิง:\n{rag_context}\n\nคำขอ: {user_message}"
            rag_messages = [
                {"role": m.role, "content": m.content}
                for m in request.messages[:-1]  # all but last user msg
            ]
            rag_messages.append({"role": "user", "content": enriched_content})
        else:
            rag_messages = [{"role": m.role, "content": m.content} for m in request.messages]
    else:
        rag_messages = [{"role": m.role, "content": m.content} for m in request.messages]

    return StreamingResponse(
        stream_llm(rag_messages),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
