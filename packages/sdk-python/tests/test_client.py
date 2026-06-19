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


def test_route_batch_parses_envelope(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_urlopen(request: Any, timeout: float = 30.0) -> _FakeResponse:
        assert request.full_url.endswith("/route/batch")
        return _FakeResponse(
            {
                "data": {
                    "batchId": "batch-r4",
                    "results": [],
                    "total": 2,
                    "succeeded": 2,
                    "failed": 0,
                    "errors": [],
                    "computedAt": "2026-06-19T00:00:00Z",
                },
                "requestId": "r4",
            }
        )

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    client = StipulateClient("test_key", base_url="http://localhost:3000/v1")
    data = client.route_batch(
        {
            "requests": [
                {
                    "merchantName": "Starbucks",
                    "amount": {"amountMinor": 650, "currency": "USD"},
                    "userCardIds": ["amex_gold"],
                }
            ]
        }
    )
    assert data["succeeded"] == 2


def test_get_org_audit_log_parses_envelope(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_urlopen(request: Any, timeout: float = 30.0) -> _FakeResponse:
        return _FakeResponse(
            {"data": {"events": [{"id": "e1", "action": "api_key.created"}]}, "requestId": "r3"}
        )

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    client = StipulateClient("test_key", base_url="http://localhost:3000/v1")
    data = client.get_org_audit_log(limit=10)
    assert data["events"][0]["action"] == "api_key.created"
