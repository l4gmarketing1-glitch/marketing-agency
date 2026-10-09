import json
import unittest
from unittest.mock import patch

import httpx
from higgsfield_client.exceptions import CredentialsMissedError, HiggsfieldClientError

from marketing_agency.higgsfield import Higgsfield, GenerationFailed, GenerationTimeout


class IntegrationTests(unittest.TestCase):
    def api(self, handler):
        api = Higgsfield()
        api.client._client = httpx.Client(
            base_url="https://api.higgsfield.ai",
            headers={"Authorization": "Key test-id:test-secret"},
            transport=httpx.MockTransport(handler),
        )
        self.addCleanup(api.close)
        return api

    def test_arbitrary_models_and_nested_inputs(self):
        calls = []
        def handle(req):
            calls.append(req)
            return httpx.Response(200, json={
                "request_id": "job-1",
                "status_url": "https://api.higgsfield.ai/requests/job-1/status",
                "cancel_url": "https://api.higgsfield.ai/requests/job-1/cancel",
            })
        api = self.api(handle)
        inputs = {"prompt": "campaign", "new_parameter": {"references": [1, 2]}}
        for model in ("higgsfield-ai/soul/v2/standard", "future-provider/new-model/video"):
            self.assertEqual(api.submit(inputs, model=model), "job-1")
            self.assertEqual(calls[-1].url.path, "/" + model)
            self.assertEqual(json.loads(calls[-1].content), inputs)
            self.assertEqual(calls[-1].headers["Authorization"], "Key test-id:test-secret")

    def test_environment_default_and_webhook(self):
        calls = []
        def handle(req):
            calls.append(req)
            return httpx.Response(200, json={"request_id": "job-1", "status_url": "https://api.higgsfield.ai/requests/job-1/status", "cancel_url": "https://api.higgsfield.ai/requests/job-1/cancel"})
        with patch.dict("os.environ", {"HIGGSFIELD_MODEL": "provider/model"}):
            self.api(handle).submit({}, webhook_url="https://example.com/hook")
        self.assertEqual(calls[0].url.params["hf_webhook"], "https://example.com/hook")

    def test_invalid_models_never_make_requests(self):
        api = self.api(lambda req: self.fail("Unexpected request"))
        for model in ("https://evil.com/model", "//evil.com/model", "provider/../model", "provider/model?x=1"):
            with self.subTest(model=model), self.assertRaises(ValueError):
                api.submit({}, model=model)
        with self.assertRaises(ValueError):
            api.submit([], model="provider/model")

    def test_hf_credentials_alias_authentication(self):
        with patch.dict("os.environ", {"HF_CREDENTIALS": "test-id:test-secret"}, clear=True), Higgsfield() as api:
            self.assertEqual(api.client._client.headers["Authorization"], "Key test-id:test-secret")

    def test_hf_key_precedes_alias(self):
        with patch.dict("os.environ", {"HF_KEY": "python-id:python-secret", "HF_CREDENTIALS": "other-id:other-secret"}, clear=True), Higgsfield() as api:
            self.assertEqual(api.client._client.headers["Authorization"], "Key python-id:python-secret")

    def test_missing_credentials(self):
        with patch.dict("os.environ", {}, clear=True), Higgsfield() as api:
            with self.assertRaises(CredentialsMissedError):
                api.submit({}, model="provider/model")

    def test_polling_and_unmodified_result(self):
        responses = iter([{"status": "queued"}, {"status": "in_progress"},
                          {"status": "completed"}, {"status": "completed"},
                          {"status": "completed", "videos": [{"url": "https://example.com/video.mp4"}], "extra": 42}])
        api = self.api(lambda req: httpx.Response(200, json=next(responses)))
        with patch("marketing_agency.higgsfield.time.sleep"):
            result = api.wait("job-1")
        self.assertEqual(result["extra"], 42)
        self.assertIn("videos", result)

    def test_terminal_failures_do_not_poll_forever(self):
        for status in ("failed", "nsfw", "canceled"):
            with self.subTest(status=status):
                api = self.api(lambda req: httpx.Response(200, json={"status": status}))
                with self.assertRaises(GenerationFailed):
                    api.wait("job-1")

    def test_wait_timeout_preserves_request_id(self):
        api = self.api(lambda req: httpx.Response(200, json={"status": "queued"}))
        with patch("marketing_agency.higgsfield.time.monotonic", side_effect=[0, 0, 0, 2]), patch("marketing_agency.higgsfield.time.sleep"):
            with self.assertRaises(GenerationTimeout) as error:
                api.wait("job-1", timeout=1)
        self.assertEqual(error.exception.request_id, "job-1")

    def test_no_automatic_resubmission(self):
        calls = []
        def handle(req):
            calls.append(req)
            return httpx.Response(503, json={"detail": "unavailable"})
        with self.assertRaises(HiggsfieldClientError):
            self.api(handle).submit({}, model="provider/model")
        self.assertEqual(len(calls), 1)

    def test_idempotency_header_scoped_to_submit_even_on_error(self):
        calls = []
        def handle(req):
            calls.append(req)
            return httpx.Response(503, json={"detail": "unavailable"})
        api = self.api(handle)
        with self.assertRaises(HiggsfieldClientError):
            api.submit({}, model="provider/model", idempotency_key="generation-1")
        self.assertEqual(calls[0].headers["Idempotency-Key"], "generation-1")
        self.assertNotIn("Idempotency-Key", api.client._client.headers)
        with self.assertRaises(ValueError):
            api.submit({}, model="provider/model", idempotency_key="contains whitespace")

    def test_cancel(self):
        calls = []
        def handle(req):
            calls.append(req)
            return httpx.Response(200, json={})
        self.api(handle).cancel("job-1")
        self.assertEqual(calls[0].method, "POST")
        self.assertEqual(calls[0].url.path, "/requests/job-1/cancel")

    def test_upload_does_not_forward_api_credentials_to_storage(self):
        def handle(req):
            self.assertEqual(req.url.path, "/files/generate-upload-url")
            return httpx.Response(200, json={"public_url": "https://cdn.example.com/image.png",
                "upload_url": "https://storage.example.com/signed", "upload_headers": {"Content-Type": "image/png"}})
        api = self.api(handle)
        def storage(req):
            self.assertNotIn("Authorization", req.headers)
            self.assertEqual(req.content, b"test image")
            return httpx.Response(200)
        api.client._upload_client = httpx.Client(transport=httpx.MockTransport(storage))
        self.assertEqual(api.client.upload(b"test image", "image/png"), "https://cdn.example.com/image.png")

    def test_invalid_wait_configuration(self):
        api = self.api(lambda req: self.fail("Unexpected request"))
        for timeout in (0, -1, float("nan"), float("inf")):
            with self.assertRaises(ValueError):
                api.wait("job-1", timeout=timeout)


if __name__ == "__main__":
    unittest.main()
