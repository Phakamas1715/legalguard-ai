"""Tests for Geocoder Service — court lookup + nearest court."""

from __future__ import annotations

import pytest

from app.services.geocoder_service import GeocoderService, GeoAddress, KNOWN_LOCATIONS


class TestKnownCourts:
    def test_find_known_court_exact(self):
        svc = GeocoderService()
        result = svc.find_known_court("ศาลฎีกา")
        assert result is not None
        assert result.city == "กรุงเทพมหานคร"
        assert result.country_code == "TH"

    def test_find_known_court_partial(self):
        svc = GeocoderService()
        result = svc.find_known_court("ปกครองกลาง")
        assert result is not None
        assert "แจ้งวัฒนะ" in result.road

    def test_find_unknown_court(self):
        svc = GeocoderService()
        result = svc.find_known_court("ศาลที่ไม่มีจริง")
        assert result is None

    def test_known_locations_have_coordinates(self):
        for name, addr in KNOWN_LOCATIONS.items():
            assert addr.lat != 0.0, f"{name} missing lat"
            assert addr.lon != 0.0, f"{name} missing lon"
            assert addr.city, f"{name} missing city"


class TestNearestCourt:
    @pytest.mark.asyncio
    async def test_nearest_to_ratchada(self):
        svc = GeocoderService()
        # Near Ratchadaphisek (ศาลแพ่ง/ศาลอาญา area)
        result = await svc.find_nearest_court(13.803, 100.554)
        assert result is not None
        assert result["distance_km"] < 5
        assert "ศาล" in result["name"]

    @pytest.mark.asyncio
    async def test_nearest_to_sanam_luang(self):
        svc = GeocoderService()
        # Near Sanam Luang (ศาลฎีกา area)
        result = await svc.find_nearest_court(13.756, 100.502)
        assert result is not None
        assert "ฎีกา" in result["name"] or "อุทธรณ์" in result["name"]

    @pytest.mark.asyncio
    async def test_nearest_returns_distance(self):
        svc = GeocoderService()
        result = await svc.find_nearest_court(13.75, 100.50)
        assert result is not None
        assert "distance_km" in result
        assert result["distance_km"] >= 0


class TestGeoAddress:
    def test_model_fields(self):
        addr = GeoAddress(
            display_name="test",
            road="ถนนทดสอบ",
            city="กรุงเทพมหานคร",
            lat=13.75,
            lon=100.50,
        )
        assert addr.display_name == "test"
        assert addr.lat == 13.75

    def test_default_values(self):
        addr = GeoAddress()
        assert addr.display_name == ""
        assert addr.lat == 0.0
        assert addr.country_code == ""
