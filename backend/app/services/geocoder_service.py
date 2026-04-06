"""Geocoder Service — self-hosted reverse geocoding via traccar-geocoder.

Converts GPS coordinates (lat/lon) → Thai address (ศาล, สถานีตำรวจ, ที่อยู่)
using OpenStreetMap data hosted locally. Data never leaves VPC → PDPA compliant.

Architecture:
  traccar/traccar-geocoder (Docker/EKS) → OSM Thailand PBF → binary index
  Python client → HTTP GET /reverse?lat=&lon=&key= → Nominatim-format JSON

Reference: https://github.com/traccar/traccar-geocoder
"""
from __future__ import annotations

from __future__ import annotations

import logging
import os
from typing import Optional

import httpx
from pydantic import BaseModel

logger = logging.getLogger(__name__)


def _geocoder_url() -> str:
    return os.getenv("GEOCODER_URL", "http://localhost:3001")


def _geocoder_key() -> str:
    return os.getenv("GEOCODER_API_KEY", "legalguard")


class GeoAddress(BaseModel):
    """Reverse geocoding result — Thai address from coordinates."""
    display_name: str = ""
    house_number: str = ""
    road: str = ""
    city: str = ""
    state: str = ""
    county: str = ""
    postcode: str = ""
    country: str = ""
    country_code: str = ""
    lat: float = 0.0
    lon: float = 0.0


# ---------------------------------------------------------------------------
# Known court/police locations for quick lookup (no geocoder needed)
# ---------------------------------------------------------------------------

KNOWN_LOCATIONS: dict[str, GeoAddress] = {
    "ศาลฎีกา": GeoAddress(
        display_name="ศาลฎีกา ถนนราชดำเนินใน แขวงพระบรมมหาราชวัง เขตพระนคร กรุงเทพมหานคร 10200",
        road="ถนนราชดำเนินใน", city="กรุงเทพมหานคร", state="กรุงเทพมหานคร",
        postcode="10200", country="ไทย", country_code="TH",
        lat=13.7563, lon=100.5018,
    ),
    "ศาลอุทธรณ์": GeoAddress(
        display_name="ศาลอุทธรณ์ ถนนราชดำเนินใน แขวงพระบรมมหาราชวัง เขตพระนคร กรุงเทพมหานคร 10200",
        road="ถนนราชดำเนินใน", city="กรุงเทพมหานคร", state="กรุงเทพมหานคร",
        postcode="10200", country="ไทย", country_code="TH",
        lat=13.7560, lon=100.5015,
    ),
    "ศาลแพ่ง": GeoAddress(
        display_name="ศาลแพ่ง ถนนรัชดาภิเษก แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900",
        road="ถนนรัชดาภิเษก", city="กรุงเทพมหานคร", state="กรุงเทพมหานคร",
        postcode="10900", country="ไทย", country_code="TH",
        lat=13.8025, lon=100.5534,
    ),
    "ศาลอาญา": GeoAddress(
        display_name="ศาลอาญา ถนนรัชดาภิเษก แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900",
        road="ถนนรัชดาภิเษก", city="กรุงเทพมหานคร", state="กรุงเทพมหานคร",
        postcode="10900", country="ไทย", country_code="TH",
        lat=13.8030, lon=100.5540,
    ),
    "ศาลปกครองกลาง": GeoAddress(
        display_name="ศาลปกครองกลาง ถนนแจ้งวัฒนะ แขวงทุ่งสองห้อง เขตหลักสี่ กรุงเทพมหานคร 10210",
        road="ถนนแจ้งวัฒนะ", city="กรุงเทพมหานคร", state="กรุงเทพมหานคร",
        postcode="10210", country="ไทย", country_code="TH",
        lat=13.8847, lon=100.5654,
    ),
}


class GeocoderService:
    """Reverse geocoding client for traccar-geocoder (self-hosted)."""

    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None):
        self.base_url = base_url or _geocoder_url()
        self.api_key = api_key or _geocoder_key()

    async def reverse(self, lat: float, lon: float) -> Optional[GeoAddress]:
        """Reverse geocode coordinates → address.

        Tries self-hosted traccar-geocoder first.
        Returns None if geocoder is unavailable.
        """
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(
                    f"{self.base_url}/reverse",
                    params={"lat": lat, "lon": lon, "key": self.api_key},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    addr = data.get("address", {})
                    return GeoAddress(
                        display_name=data.get("display_name", ""),
                        house_number=addr.get("house_number", ""),
                        road=addr.get("road", ""),
                        city=addr.get("city", ""),
                        state=addr.get("state", ""),
                        county=addr.get("county", ""),
                        postcode=addr.get("postcode", ""),
                        country=addr.get("country", ""),
                        country_code=addr.get("country_code", ""),
                        lat=lat,
                        lon=lon,
                    )
                logger.warning("Geocoder HTTP %d", resp.status_code)
        except Exception:
            logger.debug("Geocoder unavailable at %s", self.base_url)
        return None

    def find_known_court(self, name: str) -> Optional[GeoAddress]:
        """Look up a known court/police station by name (no geocoder needed)."""
        for key, addr in KNOWN_LOCATIONS.items():
            if key in name or name in key:
                return addr
        return None

    async def find_nearest_court(self, lat: float, lon: float) -> Optional[dict]:
        """Find the nearest known court to given coordinates."""
        import math

        def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
            R = 6371
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
            return R * 2 * math.asin(math.sqrt(a))

        nearest = None
        min_dist = float("inf")
        for name, addr in KNOWN_LOCATIONS.items():
            dist = haversine(lat, lon, addr.lat, addr.lon)
            if dist < min_dist:
                min_dist = dist
                nearest = {"name": name, "address": addr.model_dump(), "distance_km": round(dist, 2)}

        return nearest
