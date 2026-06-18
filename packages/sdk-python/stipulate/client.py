"""HTTP client for the Stipulate card benefit intelligence API."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any, Mapping, MutableMapping, Optional


class StipulateError(Exception):
    def __init__(
        self,
        message: str,
        status: int,
        code: Optional[str] = None,
        request_id: Optional[str] = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.request_id = request_id


class StipulateClient:
    """Production client for route, batch route, and enrich endpoints."""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.stipulate.io/v1",
        timeout: float = 30.0,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def route(self, payload: Mapping[str, Any]) -> Mapping[str, Any]:
        return self._post("/route", payload)

    def route_batch(self, payload: Mapping[str, Any]) -> Mapping[str, Any]:
        return self._post("/route/batch", payload)

    def enrich(self, payload: Mapping[str, Any]) -> Mapping[str, Any]:
        return self._post("/enrich", payload)

    def _post(self, path: str, payload: Mapping[str, Any]) -> Mapping[str, Any]:
        url = f"{self.base_url}{path}"
        body = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "X-API-Key": self.api_key,
            },
        )

        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                envelope = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            envelope: MutableMapping[str, Any] = {}
            try:
                envelope = json.loads(error.read().decode("utf-8"))
            except Exception:
                pass
            err = envelope.get("error", {})
            raise StipulateError(
                err.get("message", f"HTTP {error.code}"),
                error.code,
                err.get("code"),
                envelope.get("requestId"),
            ) from error

        if "data" not in envelope:
            raise StipulateError("Missing data envelope", 500)
        return envelope["data"]
