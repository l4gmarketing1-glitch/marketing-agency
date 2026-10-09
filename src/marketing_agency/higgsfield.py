"""Model-independent, server-side integration with the official Python SDK."""

import math
import os
import re
import time
from functools import cached_property
from typing import Any

from higgsfield_client import Completed, SyncClient
from higgsfield_client.http.retry import NoRetry
from higgsfield_client.http.transport import HttpTransport


class SingleAttemptClient(SyncClient):
    """Prevent SDK retries from silently duplicating billable submissions.

    This transport override is tied to the pinned SDK version and covered by
    HTTP-boundary tests. Retry intentionally after inspecting request status.
    """

    @cached_property
    def _transport(self) -> HttpTransport:
        return HttpTransport(self._client, NoRetry())


class GenerationFailed(RuntimeError):
    pass


class GenerationTimeout(TimeoutError):
    def __init__(self, request_id: str):
        self.request_id = request_id
        super().__init__(f"Wait timed out for {request_id}; the remote job may still be running.")


def positive(value: float, name: str) -> float:
    if not math.isfinite(value) or value <= 0:
        raise ValueError(f"{name} must be a finite positive number")
    return value


class Higgsfield:
    def __init__(self, *, request_timeout: float = 60):
        # Accept the credential name used by the official TypeScript SDK too.
        # HF_KEY retains precedence for existing Python configurations.
        credential = os.getenv("HF_KEY") or os.getenv("HF_CREDENTIALS")
        self.client = SingleAttemptClient(
            timeout=positive(request_timeout, "request_timeout"), api_key=credential
        )

    def submit(self, arguments: dict[str, Any], *, model: str | None = None,
               webhook_url: str | None = None, idempotency_key: str | None = None) -> str:
        model = model or os.getenv("HIGGSFIELD_MODEL")
        # Keep credentials on the API host; absolute URLs and path traversal
        # must never be interpreted as model IDs by the SDK's HTTP client.
        if not model or not re.fullmatch(r"[A-Za-z0-9_-]+(?:/[A-Za-z0-9_.-]+)+", model):
            raise ValueError("Provide a model endpoint ID using --model or HIGGSFIELD_MODEL")
        if any(part in (".", "..") for part in model.split("/")):
            raise ValueError("Model endpoint must not contain path traversal")
        if not isinstance(arguments, dict):
            raise ValueError("Model inputs must be a JSON object")
        if webhook_url and not webhook_url.startswith("https://"):
            raise ValueError("webhook_url must use HTTPS")
        if idempotency_key is not None and not re.fullmatch(r"[!-~]{1,255}", idempotency_key):
            raise ValueError("Idempotency key must contain 1–255 visible ASCII characters without whitespace")
        # The pinned SDK does not expose per-submission headers. One instance
        # per worker; this header must not affect subsequent operations.
        headers = self.client._client.headers
        if idempotency_key is not None:
            headers["Idempotency-Key"] = idempotency_key
        try:
            return self.client.submit(model, arguments=arguments, webhook_url=webhook_url).request_id
        finally:
            headers.pop("Idempotency-Key", None)

    @staticmethod
    def _request_id(request_id: str) -> str:
        if not re.fullmatch(r"[A-Za-z0-9_-]+", request_id):
            raise ValueError("Invalid request ID")
        return request_id

    def status(self, request_id: str) -> str:
        name = type(self.client.status(self._request_id(request_id))).__name__
        return {"InProgress": "in_progress", "NSFW": "nsfw", "Cancelled": "canceled"}.get(name, name.lower())

    def result(self, request_id: str) -> dict[str, Any]:
        request_id = self._request_id(request_id)
        status = self.client.status(request_id)
        if not isinstance(status, Completed):
            raise GenerationFailed(f"Request {request_id} is {type(status).__name__}; result unavailable")
        # SDK result() performs its own polling. Use the controller transport
        # once after checking completion so this operation cannot wait forever.
        controller = self.client.get_request_controller(request_id)
        return self.client._transport.request("GET", controller.response_url).json()

    def wait(self, request_id: str, *, timeout: float = 600,
             poll_interval: float = 2) -> dict[str, Any]:
        positive(timeout, "timeout")
        positive(poll_interval, "poll_interval")
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            status = self.status(request_id)
            if status == "completed":
                return self.result(request_id)
            if status not in ("queued", "in_progress"):
                raise GenerationFailed(f"Request {request_id} ended with status {status}")
            time.sleep(min(poll_interval, max(0, deadline - time.monotonic())))
        raise GenerationTimeout(request_id)

    def cancel(self, request_id: str) -> None:
        self.client.cancel(self._request_id(request_id))

    def upload(self, path: str) -> str:
        return self.client.upload_file(path)

    def close(self) -> None:
        # Do not initialize clients just to close an unused integration.
        for name in ("_client", "_upload_client"):
            if name in self.client.__dict__:
                self.client.__dict__[name].close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
