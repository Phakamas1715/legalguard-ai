"""Speech-to-Text API endpoints for court hearing transcription."""

from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.services.stt_service import STTService, TranscriptionResult

router = APIRouter(prefix="/stt", tags=["speech-to-text"])

_stt = STTService()


@router.post("/transcribe", response_model=TranscriptionResult)
async def transcribe_audio(
    file: UploadFile = File(...),
    duration_seconds: int = Form(0),
):
    """Upload audio file and get Thai transcript with speaker labels."""
    audio_bytes = await file.read()
    result = await _stt.transcribe(
        audio_bytes=audio_bytes,
        filename=file.filename or "audio.wav",
        duration_seconds=duration_seconds,
    )
    if result.status == "error":
        raise HTTPException(status_code=400, detail=result.transcript_text)
    return result


@router.get("/status/{job_id}", response_model=TranscriptionResult)
async def get_transcription_status(job_id: str):
    """Check transcription job status."""
    result = _stt.get_status(job_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return result
