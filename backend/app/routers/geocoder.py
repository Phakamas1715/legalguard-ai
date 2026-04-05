"""Geocoder API — reverse geocoding + court/police station lookup.

Self-hosted via traccar-geocoder (OSM Thailand data, PDPA compliant).
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.services.geocoder_service import GeocoderService, KNOWN_LOCATIONS

router = APIRouter(prefix="/geocoder", tags=["geocoder"])

_service = GeocoderService()


@router.get("/reverse")
async def reverse_geocode(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
):
    """Reverse geocode coordinates → Thai address.

    Uses self-hosted traccar-geocoder (OSM data, no external API calls).
    """
    result = await _service.reverse(lat, lon)
    if result:
        return result.model_dump()
    return {"error": "Geocoder ไม่พร้อมใช้งาน — ตรวจสอบว่า traccar-geocoder ทำงานอยู่", "lat": lat, "lon": lon}


@router.get("/court")
async def find_court(name: str = Query(..., description="ชื่อศาล เช่น ศาลฎีกา")):
    """Look up court location by name."""
    result = _service.find_known_court(name)
    if result:
        return {"found": True, "name": name, "address": result.model_dump()}
    return {"found": False, "name": name, "message": "ไม่พบข้อมูลศาลนี้"}


@router.get("/nearest-court")
async def nearest_court(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
):
    """Find nearest known court to given coordinates."""
    result = await _service.find_nearest_court(lat, lon)
    if result:
        return result
    return {"error": "ไม่พบศาลใกล้เคียง"}


@router.get("/courts")
async def list_courts():
    """List all known court locations."""
    return {
        "courts": [
            {"name": name, **addr.model_dump()}
            for name, addr in KNOWN_LOCATIONS.items()
        ]
    }
