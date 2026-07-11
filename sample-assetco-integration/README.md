# CEF-PIP Sample AssetCo Integration

A minimal, dependency-free reference implementation showing how to send events to CEF's
Portfolio Intelligence Platform (CEF-PIP). Use this to test your sandbox credentials and as a
copy-paste starting point for your own integration — it's not a library you install, just a
worked example.

See the full [API Integration Guide](../documents/API_Integration_Guide.md) for the complete
event reference; this README only covers running the sample itself.

## Requirements

- Node.js 18 or later (for the built-in `fetch`)
- No npm install needed — this uses only Node's built-in modules

## Setup

1. Copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
2. Fill in the three values CEF gave you when your onboarding application was approved:
   - `CEF_API_URL` — the sandbox API base URL
   - `ASSETCO_ID` — your AssetCo ID
   - `HMAC_SECRET` — your sandbox signing secret

   **Never commit your `.env` file or share your `HMAC_SECRET` outside your own team.**

## Usage

Send a single event type:

```
node send-event.js payment.received
```

Send every event type in order (customer created → asset created → deployed → a payment
received → a payment missed → a default → a fault detected → resolved → disabled/enabled →
telemetry → rider inactive → decommissioned → heartbeat) — this tells one coherent story end to
end and is the fastest way to confirm your whole integration path works:

```
node send-event.js --all
```

Valid event types (pass any one of these as the argument):

```
customer.created, asset.created, asset.deployed, asset.decommissioned,
payment.received, payment.missed, payment.defaulted,
asset.fault.detected, asset.fault.resolved,
asset.disabled, asset.enabled, telemetry.updated, rider.inactive,
sync.heartbeat
```

## What this script does

1. Builds a sample JSON payload for the event type you asked for (see `payloads.js`).
2. Serializes it to a string and computes an HMAC-SHA256 signature over that exact string using
   your `HMAC_SECRET`.
3. POSTs it to `{CEF_API_URL}/api/v1/events` with the required `X-CEF-AssetCo-Id` and
   `X-CEF-Signature` headers.
4. Prints the response — `200` with an `eventId` means it was accepted.

Adapt `payloads.js` to build payloads from your own data once you're past the "does my signature
verify" stage — the signing logic in `send-event.js` (`sign()`) is the part to carry over
unchanged into your real integration, regardless of what language/stack you build it in.

## Troubleshooting

- **`401 Invalid signature`** — almost always means the body was re-serialized somewhere between
  signing and sending (different key order, extra whitespace, etc.), or the wrong secret. Sign the
  exact bytes you send, and sign second — validate your own signature locally before assuming the
  server is wrong.
- **`400 Missing X-CEF-AssetCo-Id or X-CEF-Signature header`** — check both headers are present.
- **`401 Unknown or inactive AssetCo`** — double-check `ASSETCO_ID`, and confirm with CEF that your
  AssetCo record is active in that environment.
