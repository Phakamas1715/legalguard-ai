"""Speech-to-Text Service for court hearing transcription.

Transcribes Thai audio to text with speaker diarization,
PII masking, and low-confidence segment flagging.
Supports WAV, MP3, M4A, FLAC up to 120 minutes.
"""
from __future__ import annotations

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field

from app.services.audit_service import AuditService
from app.services.pii_masking import mask_pii

logger = logging.getLogger(__name__)

SUPPORTED_FORMATS = {"wav", "mp3", "m4a", "flac"}
MAX_DURATION_MINUTES = 120


class TranscriptionSegment(BaseModel):
    speaker: str = ""
    start_time: float = 0.0
    end_time: float = 0.0
    text: str = ""
    confidence: float = 1.0


class TranscriptionResult(BaseModel):
    job_id: str
    status: str = "completed"
    transcript_text: str = ""
    segments: list[TranscriptionSegment] = Field(default_factory=list)
    speakers: list[str] = Field(default_factory=list)
    low_confidence_segments: list[dict] = Field(default_factory=list)
    duration_seconds: int = 0
    pii_masked: bool = True
    pii_count: int = 0


class STTService:
    """Speech-to-Text service with Thai support, speaker diarization, and PII masking."""

    def __init__(self, audit_service: Optional[AuditService] = None):
        self.audit = audit_service or AuditService()
        self._jobs: dict[str, TranscriptionResult] = {}

    async def transcribe(self, audio_bytes: bytes, filename: str, duration_seconds: int = 0) -> TranscriptionResult:
        """Transcribe audio file to Thai text.

        Pipeline:
        1. Validate format and duration
        2. Transcribe audio (placeholder — will use AWS Transcribe or Whisper)
        3. Speaker diarization
        4. PII masking
        5. Flag low-confidence segments
        6. Log to audit
        """
        job_id = str(uuid.uuid4())

        # 1. Validate
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in SUPPORTED_FORMATS:
            return TranscriptionResult(
                job_id=job_id, status="error",
                transcript_text=f"รูปแบบไฟล์ไม่รองรับ กรุณาใช้: {', '.join(SUPPORTED_FORMATS)}",
            )
        if duration_seconds > MAX_DURATION_MINUTES * 60:
            return TranscriptionResult(
                job_id=job_id, status="error",
                transcript_text=f"ไฟล์เสียงยาวเกิน {MAX_DURATION_MINUTES} นาที",
            )

        # 2. Transcribe (placeholder — returns simulated result)
        raw_segments = self._simulate_transcription(audio_bytes, duration_seconds)

        # 3. Identify speakers
        speakers = list({s.speaker for s in raw_segments if s.speaker})

        # 4. PII masking on full transcript
        full_text = " ".join(s.text for s in raw_segments)
        masked_text, pii_spans, pii_count = mask_pii(full_text)

        # Also mask each segment
        masked_segments = []
        for seg in raw_segments:
            masked_seg_text, _, _ = mask_pii(seg.text)
            masked_segments.append(TranscriptionSegment(
                speaker=seg.speaker, start_time=seg.start_time,
                end_time=seg.end_time, text=masked_seg_text, confidence=seg.confidence,
            ))

        # 5. Flag low-confidence segments (< 0.7)
        low_conf = [
            {"start_time": s.start_time, "end_time": s.end_time, "confidence": s.confidence}
            for s in masked_segments if s.confidence < 0.7
        ]

        result = TranscriptionResult(
            job_id=job_id, status="completed", transcript_text=masked_text,
            segments=masked_segments, speakers=speakers,
            low_confidence_segments=low_conf, duration_seconds=duration_seconds,
            pii_masked=pii_count > 0, pii_count=pii_count,
        )

        # 6. Log to audit
        self.audit.log_entry(query=filename, action="stt", result_count=len(raw_segments),
                             confidence=sum(s.confidence for s in raw_segments) / max(len(raw_segments), 1),
                             metadata={"duration": duration_seconds, "speakers": len(speakers), "pii_count": pii_count})

        self._jobs[job_id] = result
        return result

    def get_status(self, job_id: str) -> Optional[TranscriptionResult]:
        return self._jobs.get(job_id)

    @staticmethod
    def _simulate_transcription(audio_bytes: bytes, duration: int) -> list[TranscriptionSegment]:
        """Placeholder — simulates transcription. Replace with AWS Transcribe or Whisper."""
        return [
            TranscriptionSegment(speaker="ผู้พิพากษา", start_time=0.0, end_time=15.0,
                                 text="คดีนี้โจทก์ฟ้องว่าจำเลยผิดสัญญา", confidence=0.95),
            TranscriptionSegment(speaker="ทนายโจทก์", start_time=15.0, end_time=30.0,
                                 text="ขอเรียนศาลว่า จำเลยไม่ชำระหนี้ตามสัญญากู้ยืม", confidence=0.88),
            TranscriptionSegment(speaker="ทนายจำเลย", start_time=30.0, end_time=45.0,
                                 text="จำเลยขอปฏิเสธข้อกล่าวหาทั้งหมด", confidence=0.62),
        ]
