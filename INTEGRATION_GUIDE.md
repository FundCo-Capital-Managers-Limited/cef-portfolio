# AssetCo Integration Guide

How to send data to CEF-PIP from your platform. This is the reference to hand to an AssetCo's
development team during onboarding (Week 6 of the MVP plan).

## 1. Endpoint & authentication

```
POST https://<cef-pip-api-host>/api/v1/events
```

Every request must carry two headers:

| Header | Value |
|---|---|
| `X-CEF-AssetCo-Id` | Your AssetCo identifier, as registered in CEF-PIP (e.g. `GROSOLAR`) |
| `X-CEF-Signature` | Hex-encoded HMAC-SHA256 of the **raw request body**, signed with the secret CEF issued you |

Signature example (Node.js):

```js
const crypto = require('crypto');
const signature = crypto.createHmac('sha256', YOUR_HMAC_SECRET).update(rawBodyString).digest('hex');
```

Sign the exact bytes you send — re-serializing the JSON object before signing (different key
order, whitespace) will produce a different signature and CEF-PIP will reject the request with
`401 Invalid signature`. Compute the signature from the same string you pass as the request body.

A successful request returns `200 { "status": "accepted", "eventId": "<uuid>" }`. The event is
stored durably the moment you get a 200 — if downstream processing fails on CEF-PIP's side, that's
caught by nightly reconciliation, not by you needing to retry.

## 2. Standard event types

| Event | When to send it |
|---|---|
| `customer.created` | A new customer is onboarded (see §3 for status handling) |
| `asset.created` | An asset is registered but not yet installed |
| `asset.deployed` | An asset is physically installed and commissioned |
| `asset.decommissioned` | An asset is taken offline permanently |
| `payment.received` | A customer payment is recorded |
| `payment.missed` | A scheduled payment was not received by its due date |
| `payment.defaulted` | A customer has crossed your default threshold |
| `asset.fault.detected` | A fault condition is identified on an asset |
| `asset.fault.resolved` | A previously reported fault is resolved |
| `asset.disabled` / `asset.enabled` | An asset is disabled/re-enabled (Phase 2 — accepted and stored, no processing yet) |
| `telemetry.updated` | A telemetry threshold is crossed (Phase 2 — accepted and stored, no processing yet) |
| `rider.inactive` | An SSM rider has made no remittance within the inactivity window (Phase 2) |
| `sync.heartbeat` | Periodic health signal — send at least daily |

Base payload shape (all events):

```json
{
  "eventType": "payment.received",
  "assetCoId": "GROSOLAR",
  "assetId": "GS-1001",
  "customerId": "CUS-0042",
  "amount": 75000,
  "currency": "NGN",
  "timestamp": "2026-06-20T10:00:00Z",
  "sourceRef": "TXN-84729",
  "metadata": { "channel": "bank_transfer" }
}
```

`amount`, `currency`, and `assetId` are required for `payment.received` / `payment.missed` /
`payment.defaulted`. Everything else is optional.

## 3. Customer status — read this if you have existing customers

`customer.created` now accepts an optional `status` field:

```
PIPELINE | ASSET_ORDERED | INSTALLATION_SCHEDULED | ACTIVE | IN_ARREARS | DEFAULTED | CHURNED
```

If you don't send it, CEF-PIP defaults new customers to `PIPELINE` (not yet deployed). **If you're
onboarding with an existing, already-active customer base, send `"status": "ACTIVE"` explicitly**
— otherwise every one of your real customers will show up in CEF-PIP's pre-deployment pipeline
view, which will be wrong and confusing on the Portfolio Dashboard.

Other optional `customer.created` fields, useful if you're bringing in pipeline (pre-deployment)
customers so CEF can see your deployment pipeline:

```json
{
  "eventType": "customer.created",
  "assetCoId": "GROSOLAR",
  "customerId": "CUS-0042",
  "timestamp": "2026-06-20T10:00:00Z",
  "status": "PIPELINE",
  "metadata": { "name": "Ada Lovelace" },
  "contractSignedDate": "2026-06-01",
  "expectedInstallationDate": "2026-07-15",
  "expectedMonthlyPaymentNgn": 50000,
  "contractTermMonths": 24,
  "locationState": "Lagos",
  "locationLga": "Ikeja",
  "customerSegment": "RESIDENTIAL"
}
```

`customerSegment` is one of `RESIDENTIAL | SME | COMMERCIAL | COMMUNITY | INSTITUTION`.

Once a customer's status changes (installation scheduled, goes active, falls into arrears, etc.),
either re-send `customer.created` with the new `status` (idempotent upsert) or have your CEF-PIP
contact update it directly via the dashboard.

## 4. Remote control fields — read this regardless of whether your hardware supports it

`asset.created` and `asset.deployed` now accept:

```json
{
  "eventType": "asset.created",
  "assetCoId": "GROSOLAR",
  "assetId": "GS-1001",
  "customerId": "CUS-0042",
  "timestamp": "2026-06-20T10:00:00Z",
  "oemModel": "Itel Solar 5kVA Inverter",
  "oemManufacturer": "Itel",
  "oemRemoteControlApiAvailable": false,
  "remoteControlSupported": false
}
```

- `oemRemoteControlApiAvailable` — does the OEM hardware itself support remote disable/enable
  commands, regardless of whether CEF-PIP has an integration for it yet?
- `remoteControlSupported` — set this to `true` only once **both** (a) the hardware supports it
  and (b) your platform has implemented the `/cef/control/disable` and `/cef/control/enable`
  endpoints (architecture doc §7.3). Leave `false` (the default) if you're not sure — this only
  controls whether Disable/Enable buttons appear in the CEF-PIP dashboard, and those buttons are
  inert placeholders in the current MVP regardless (control action execution is Phase 2).

All four fields are optional — if omitted, CEF-PIP defaults to `false`/unset and just won't show a
remote-control affordance for that asset.

## 5. Reconciliation endpoints (optional, but recommended)

If your platform can expose them, CEF-PIP's nightly reconciliation job will pull these to catch any
events that failed to arrive via webhook:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/cef/assets` | All CEF-funded assets with current status |
| GET | `/cef/payments?from=&to=` | Payments in a date range |
| GET | `/cef/faults?status=open` | Open fault records |

See `api/src/controllers/mockAssetcoController.js` in this repo for a reference implementation of
the expected response shape for each.

## 6. Questions

Contact the CEF-PIP IT team with your AssetCo ID and any integration questions before going live —
we'll provision your HMAC secret and confirm your first test event together.
