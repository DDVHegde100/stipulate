"""HTTP client for the Stipulate card benefit intelligence API."""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
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
    """Production client for route, enrich, catalog, and billing endpoints."""

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

    def list_cards(self, q: Optional[str] = None, limit: Optional[int] = None) -> Mapping[str, Any]:
        params: dict[str, str] = {}
        if q:
            params["q"] = q
        if limit is not None:
            params["limit"] = str(limit)
        query = f"?{urllib.parse.urlencode(params)}" if params else ""
        return self._get(f"/cards{query}")

    def get_card_benefits(self, card_id: str, as_of: Optional[str] = None) -> Mapping[str, Any]:
        params = {"as_of": as_of} if as_of else {}
        query = f"?{urllib.parse.urlencode(params)}" if params else ""
        return self._get(f"/cards/{urllib.parse.quote(card_id)}/benefits{query}")

    def get_changelog(self, limit: Optional[int] = None, card_id: Optional[str] = None) -> Mapping[str, Any]:
        params: dict[str, str] = {}
        if limit is not None:
            params["limit"] = str(limit)
        if card_id:
            params["card_id"] = card_id
        query = f"?{urllib.parse.urlencode(params)}" if params else ""
        return self._get(f"/changelog{query}")

    def get_valuations(self) -> Mapping[str, Any]:
        return self._get("/valuations")

    def get_usage(self) -> Mapping[str, Any]:
        return self._get("/usage")

    def create_webhook(self, payload: Mapping[str, Any]) -> Mapping[str, Any]:
        return self._post("/webhooks", payload)

    def delete_webhook(self, webhook_id: str) -> Mapping[str, Any]:
        return self._delete(f"/webhooks/{webhook_id}")

    def list_api_keys(self) -> Mapping[str, Any]:
        return self._get("/keys")

    def create_api_key(self, payload: Mapping[str, Any]) -> Mapping[str, Any]:
        return self._post("/keys", payload)

    def revoke_api_key(self, key_id: str) -> Mapping[str, Any]:
        return self._delete(f"/keys/{key_id}")

    def get_spend_summary(self, user_ref: str, card_ids: list[str]) -> Mapping[str, Any]:
        query = urllib.parse.urlencode({"user_ref": user_ref, "card_ids": ",".join(card_ids)})
        return self._get(f"/spend/summary?{query}")

    def list_webhook_deliveries(self, limit: Optional[int] = None) -> Mapping[str, Any]:
        params = {"limit": str(limit)} if limit is not None else {}
        query = f"?{urllib.parse.urlencode(params)}" if params else ""
        return self._get(f"/webhooks/deliveries{query}")

    def get_org_audit_log(self, limit: Optional[int] = None) -> Mapping[str, Any]:
        params = {"limit": str(limit)} if limit is not None else {}
        query = f"?{urllib.parse.urlencode(params)}" if params else ""
        return self._get(f"/org/audit{query}")

    def proxy_pay(self, payload: Mapping[str, Any]) -> Mapping[str, Any]:
        return self._post("/proxy-pay", payload)

    def list_vaulted_payment_methods(self) -> Mapping[str, Any]:
        return self._get("/billing/payment-methods")

    def vault_payment_method(self, payload: Mapping[str, Any]) -> Mapping[str, Any]:
        return self._post("/billing/payment-methods", payload)

    def remove_vaulted_payment_method(self, method_id: str) -> Mapping[str, Any]:
        return self._delete(f"/billing/payment-methods/{urllib.parse.quote(method_id)}")

    def create_cardholder(self, payload: Optional[Mapping[str, Any]] = None) -> Mapping[str, Any]:
        return self._post("/issuing/cardholders", payload or {})

    def issue_virtual_card(self, payload: Mapping[str, Any]) -> Mapping[str, Any]:
        return self._post("/issuing/cards/virtual", payload)

    def list_virtual_cards(self, cardholder_id: str) -> Mapping[str, Any]:
        query = urllib.parse.urlencode({"cardholderId": cardholder_id})
        return self._get(f"/issuing/cards/virtual?{query}")

    def update_virtual_card_status(self, card_id: str, status: str) -> Mapping[str, Any]:
        return self._patch(
            f"/issuing/cards/virtual/{urllib.parse.quote(card_id)}/status",
            {"status": status},
        )

    def list_issuing_authorizations(
        self,
        cardholder_id: Optional[str] = None,
        virtual_card_id: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> Mapping[str, Any]:
        params: dict[str, str] = {}
        if cardholder_id:
            params["cardholderId"] = cardholder_id
        if virtual_card_id:
            params["virtualCardId"] = virtual_card_id
        if limit is not None:
            params["limit"] = str(limit)
        query = f"?{urllib.parse.urlencode(params)}" if params else ""
        return self._get(f"/issuing/authorizations{query}")

    def _patch(self, path: str, payload: Mapping[str, Any]) -> Mapping[str, Any]:
        url = f"{self.base_url}{path}"
        body = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=body,
            method="PATCH",
            headers={
                "Content-Type": "application/json",
                "X-API-Key": self.api_key,
            },
        )
        return self._execute(request)

    def _delete(self, path: str) -> Mapping[str, Any]:
        url = f"{self.base_url}{path}"
        request = urllib.request.Request(
            url,
            method="DELETE",
            headers={"X-API-Key": self.api_key},
        )
        return self._execute(request)

    def _get(self, path: str) -> Mapping[str, Any]:
        url = f"{self.base_url}{path}"
        request = urllib.request.Request(
            url,
            method="GET",
            headers={"X-API-Key": self.api_key},
        )
        return self._execute(request)

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
        return self._execute(request)

    def _execute(self, request: urllib.request.Request) -> Mapping[str, Any]:
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
