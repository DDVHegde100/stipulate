"""Tests for the Stipulate Python SDK."""

from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError

import pytest

from stipulate.client import StipulateClient, StipulateError


class _FakeResponse:
    def __init__(self, payload: dict[str, Any]) -> None:
        self._payload = payload

    def read(self) -> bytes:
        return json.dumps(self._payload).encode("utf-8")

    def __enter__(self) -> "_FakeResponse":
        return self

    def __exit__(self, *args: object) -> None:
        return None


def test_list_cards_parses_envelope(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_urlopen(request: Any, timeout: float = 30.0) -> _FakeResponse:
        assert request.get_header("X-api-key") == "test_key"
        return _FakeResponse({"data": {"cards": [{"card_id": "amex_gold"}]}, "requestId": "r1"})

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    client = StipulateClient("test_key", base_url="http://localhost:3000/v1")
    data = client.list_cards(limit=5)
    assert data["cards"][0]["card_id"] == "amex_gold"


def test_route_raises_stipulate_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_urlopen(request: Any, timeout: float = 30.0) -> _FakeResponse:
        raise HTTPError(
            request.full_url,
            422,
            "Unprocessable",
            hdrs=None,
            fp=_FakeResponse(
                {"error": {"message": "Invalid route request", "code": "VALIDATION_ERROR"}, "requestId": "r2"}
            ),
        )

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    client = StipulateClient("test_key", base_url="http://localhost:3000/v1")

    with pytest.raises(StipulateError) as exc:
        client.route({"amount": {"amountMinor": -1, "currency": "USD"}, "userCardIds": []})

    assert exc.value.status == 422
