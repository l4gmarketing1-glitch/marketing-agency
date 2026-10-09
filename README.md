# Marketing agency — Higgsfield integration

A server-side Python library and CLI using the [official Higgsfield SDK](https://docs.higgsfield.ai/docs/how-to/sdk). Requires Python 3.12+. No web server is needed.

## Installation

```bash
cd /workspace/marketing-agency
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.lock
.venv/bin/python -m pip install --no-deps -e .
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/python -m pip check
```

The lockfile pins all runtime dependencies. Tests mock HTTP requests and never incur charges.

## Credentials

Create credentials in the [Higgsfield Console](https://console.higgsfield.ai). Set `HF_CREDENTIALS` securely to the combined **key-id:key-secret** value in cloud environment settings. Alternatively, set both `HF_API_KEY` and `HF_API_SECRET`; `HF_KEY` is also supported and takes precedence over `HF_CREDENTIALS`. Never paste credentials into chat or commit them.

`.env.example` documents the names. Local `.env` files are ignored but **not automatically loaded**; credentials must be injected into the process environment. Run this integration only on a trusted server.

## Switching models

Choose an endpoint ID from the [model reference](https://docs.higgsfield.ai/docs/models) and pass its documented inputs as a JSON object. No fixed model list or image-only output parser is imposed. Switching models means changing the endpoint and input JSON, without editing the core integration. Availability depends on account access, credits, and the provider's operational state.

```bash
# Billable when credentials are configured.
.venv/bin/marketing-higgsfield submit \
  --model higgsfield-ai/soul/v2/standard \
  --input examples/soul.json \
  --idempotency-key campaign-asset-001

# Use the request_id returned by submit.
.venv/bin/marketing-higgsfield status REQUEST_ID
.venv/bin/marketing-higgsfield wait REQUEST_ID --timeout 600
.venv/bin/marketing-higgsfield result REQUEST_ID
.venv/bin/marketing-higgsfield cancel REQUEST_ID
```

Set `HIGGSFIELD_MODEL` for a default; `--model` overrides it. `--input -` reads stdin. The full API response is preserved as JSON, including images, videos, metadata, and future fields. `result` requires completion; `wait` polls and detects failures, moderation outcomes, and cancellation. A wait timeout leaves the remote job running. Its deadline may be exceeded by an in-flight HTTP call, which has a 60-second request timeout.

```python
from marketing_agency.higgsfield import Higgsfield

with Higgsfield() as api:
    request_id = api.submit(
        {"prompt": "Editorial portrait in soft daylight"},
        model="higgsfield-ai/soul/v2/standard",
        idempotency_key="campaign-asset-001",
    )
    result = api.wait(request_id, timeout=600)
```

Use one instance per worker; concurrent sharing is not supported. Python callers receive exceptions. CLI failures return exit code 1 and omit raw server messages to avoid leaking credentials or inputs.

## Uploads and webhooks

```bash
.venv/bin/marketing-higgsfield upload ./reference.png
```

Use the returned URL in the selected model's documented image, video, or audio input field. Presigned uploads do not receive Higgsfield API credentials. Public HTTPS input URLs work without uploads.

`submit --webhook-url https://your-service.example/hook` registers an existing receiver. This project does not host a webhook receiver; polling works without one.

## Retries and network access

Automatic SDK retries are disabled to prevent duplicate billable submissions. Persist an idempotency key before submitting. After an ambiguous timeout or server error, repeat the same endpoint, JSON, and webhook with the same key. Use a new key for an intentional new generation. The transport and header overrides depend on pinned SDK 0.2.0 and are covered by HTTP-boundary tests; rerun them when upgrading.

Allow `api.higgsfield.ai` for API calls and `docs.higgsfield.ai` for documentation. Installation uses the existing package-manager preset. Presigned storage and output hosts are returned dynamically; allow the exact hosts once observed. Official upload docs do not name those hosts, so live storage connectivity remains unverified until credentials are supplied. The CLI returns generated asset URLs without downloading them.

## Validation

### GitHub Actions

The **Higgsfield tests and manual generation** workflow runs credential-free tests on pushes and pull requests. You can also run it from **Actions → Higgsfield tests and manual generation → Run workflow**.

To generate through GitHub, add a repository Actions secret named `HF_CREDENTIALS`, with the combined `key-id:key-secret` value, under **Settings → Secrets and variables → Actions**. Cloud environment secrets are separate and are not automatically copied to GitHub.

Select **Run a LIVE generation** only when you want a billable API request. Choose any model endpoint and its JSON inputs; otherwise leave the box unchecked to run only tests. The workflow submits one request, waits up to ten minutes, and stores request/result JSON in a `higgsfield-result` artifact for one day. Download it to obtain generated asset URLs. Re-running the same workflow run retains its idempotency key; starting a new run creates a new generation. Timeout does not cancel the remote job. Generated media URLs may expire according to provider retention.

Tests cover arbitrary models and nested inputs, authentication wiring, model defaults, polling, terminal failures, timeouts, cancellation, idempotency, prevention of automatic submission retries, and credential isolation on uploads. Installation and CLI help are validated without credentials. Live authentication, generation, model access, and uploads remain pending credentials and runtime network configuration.

References: [SDK](https://docs.higgsfield.ai/docs/how-to/sdk), [authentication](https://docs.higgsfield.ai/docs/authentication), [idempotency](https://docs.higgsfield.ai/docs/concepts/idempotency), [uploads](https://docs.higgsfield.ai/docs/concepts/file-uploads), [SDK source](https://github.com/higgsfield-ai/higgsfield-client).
