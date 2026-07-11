# CEF-PIP — AssetCo API Integration Guide

This is the guide to hand to an AssetCo's developers once their onboarding application has been
approved. It covers everything needed to send real data into CEF-PIP: authentication, the event
types CEF-PIP understands, and the two endpoints your platform needs to expose so CEF can
reconcile its records against yours.

A runnable code sample implementing everything in this guide lives in
[`sample-assetco-integration/`](../sample-assetco-integration/) at the root of this repo — clone or
unzip it, set your environment variables, and run it against your sandbox credentials before
writing your own integration from scratch.

## 1. Environments

| Environment | Base URL | Notes |
|---|---|---|
| Sandbox / test | *(provided separately by CEF — points at `cef-pip-api-staging`)* | Use this while building your integration. Data here is periodically reset. |
| Production | *(provided separately by CEF — points at `cef-pip-api`)* | Only switch to this once CEF has moved your AssetCo record out of `ONBOARDING`. |

Each environment has its own **AssetCo ID** and **HMAC signing secret** — these are not
interchangeable between sandbox and production. CEF will give you both when your application is
approved (and again, separately, once you're cleared for production).

## 2. Authentication — HMAC-SHA256 request signing

Every event you send is authenticated with an HMAC-SHA256 signature over the **raw JSON request
body**, computed with your AssetCo's secret key. There is no bearer token or API key header —
just the signature.

**Required headers on every `POST /api/v1/events` request:**

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `X-CEF-AssetCo-Id` | Your AssetCo ID (e.g. `BRIGHTFUTURE`) |
| `X-CEF-Signature` | Hex-encoded HMAC-SHA256 signature of the raw request body |

**Computing the signature** (must be over the exact bytes you send — not a re-serialized copy,
since differing key order or whitespace produces a different signature):

```js
const crypto = require('crypto');

function signBody(rawBodyString, secret) {
  return crypto.createHmac('sha256', secret).update(rawBodyString).digest('hex');
}
```

If the signature doesn't match, you'll get `401 { "error": "Invalid signature" }`. If the
`X-CEF-AssetCo-Id` or `X-CEF-Signature` header is missing entirely, you'll get `400`.

**Keep your secret out of source control.** If it's ever exposed, ask CEF to rotate it
immediately — CEF can regenerate it from the AssetCo's profile page at any time, but note that
doing so invalidates the old secret immediately.

## 3. Sending an event — `POST /api/v1/events`

Every event shares this base shape:

```json
{
  "eventType": "payment.received",
  "assetCoId": "BRIGHTFUTURE",
  "timestamp": "2026-07-11T14:32:00Z",
  "...": "event-type-specific fields below"
}
```

- `eventType` — must be one of the 14 types in the table below.
- `assetCoId` — must match the `X-CEF-AssetCo-Id` header exactly, or the request is rejected.
- `timestamp` — ISO 8601. This is when the event occurred in your system, not when you sent it.

**Response:** `200 { "status": "accepted", "eventId": "<uuid>" }` means the event was durably
recorded. CEF-PIP always stores the raw event first, then processes it — if processing fails for
some reason on CEF's side, you still get a `200` (the failure is caught by CEF's own nightly
reconciliation, not by making you retry a webhook that already succeeded). **A non-200 response
means the event was NOT recorded and you should retry.**

### Event types

| `eventType` | Purpose | Key fields beyond the base shape |
|---|---|---|
| `customer.created` | Register a new customer | `customerId`, `status` (optional — `PIPELINE`/`ASSET_ORDERED`/`INSTALLATION_SCHEDULED`/`ACTIVE`/`IN_ARREARS`/`DEFAULTED`/`CHURNED`, defaults to `PIPELINE`), `metadata.name`, `contractSignedDate`, `expectedInstallationDate`, `expectedMonthlyPaymentNgn`, `contractTermMonths`, `locationState`, `locationLga`, `customerSegment` |
| `asset.created` | Register a new asset (not yet installed) | `assetId`, `customerId`, `assetType` (free text, e.g. `"Solar Home System"`), `equipmentSpec` (free text, e.g. `"100kWp Solar Panel Array"`), `oemModel`, `oemManufacturer`, `ownershipModel` (`OUTRIGHT_PURCHASE`/`LEASE_TO_OWN`/`PAYG_METERED`), `remoteControlSupported`, `oemRemoteControlApiAvailable` |
| `asset.deployed` | Asset physically installed/commissioned | Same fields as `asset.created` — sets `deployed_at` to this event's timestamp |
| `asset.decommissioned` | Asset taken offline/removed from service | `assetId` |
| `payment.received` | A scheduled payment was collected | `assetId`, `customerId`, `amount` (number), `currency` (e.g. `"NGN"`), `sourceRef` (optional, your own payment reference) |
| `payment.missed` | A scheduled payment was not collected | Same fields as `payment.received` |
| `payment.defaulted` | Customer crossed your default threshold | Same fields as `payment.received` — triggers a CEF alert |
| `asset.fault.detected` | A fault was detected on an asset | `assetId`, `metadata` (free-form JSON detail, e.g. `{"code": "INVERTER_OFFLINE"}`) — triggers a CEF alert |
| `asset.fault.resolved` | The most recent open fault on an asset was resolved | `assetId` |
| `sync.heartbeat` | Periodic health signal | No extra fields — send this regularly (e.g. hourly) so CEF's dashboard doesn't flag your integration as stale |
| `asset.disabled` | *(stored, not yet processed — Phase 2)* | — |
| `asset.enabled` | *(stored, not yet processed — Phase 2)* | — |
| `telemetry.updated` | *(stored, not yet processed — Phase 2)* | — |
| `rider.inactive` | *(stored, not yet processed — Phase 2)* | — |

The last four event types are accepted and durably stored today, but CEF-PIP doesn't act on them
yet — send them if you have the data, and CEF's processing will pick them up once that work
ships, with no changes needed on your side.

### Example: `payment.received`

```json
{
  "eventType": "payment.received",
  "assetCoId": "BRIGHTFUTURE",
  "timestamp": "2026-07-11T09:15:00Z",
  "assetId": "BF-1001",
  "customerId": "CUS-4471",
  "amount": 55000,
  "currency": "NGN",
  "sourceRef": "PSTK-8823910"
}
```

### Out-of-order delivery

You don't have to send `asset.created`/`customer.created` before the first `payment.*` or
`asset.fault.*` event for that asset/customer — CEF-PIP creates a minimal placeholder record on
first reference and fills in the real details once the `*.created` event arrives. It's still best
practice to send `*.created` events promptly, though, since the placeholder has no name/type/deal
info until then.

## 4. Reconciliation endpoints you must expose

CEF-PIP runs a nightly reconciliation job that calls back into **your** platform to catch
anything a missed or failed webhook might have dropped. You need to expose three read-only
endpoints, matching this shape (see `api/src/controllers/mockAssetcoController.js` in this repo
for CEF's own reference implementation of what these should return):

| Endpoint | Returns |
|---|---|
| `GET /cef/assets` | Array of `{ assetId, customerId, status, deployedAt, updatedAt }` |
| `GET /cef/payments?from=&to=` | Array of `{ assetId, customerId, amount, currency, status, sourceRef, occurredAt }` |
| `GET /cef/faults?status=open` | Array of `{ assetId, status, detectedAt }` |

CEF will ask for the base URL of these endpoints when reviewing your onboarding application
(`assetcos.base_url`). Authentication for these is agreed separately during onboarding — talk to
your CEF contact.

## 5. Testing your integration

1. Use the sandbox base URL and the sandbox AssetCo ID/secret CEF gave you.
2. Run the sample sender in [`sample-assetco-integration/`](../sample-assetco-integration/) —
   it walks through every event type against your sandbox credentials.
3. Confirm events show up in the CEF-PIP dashboard (your CEF contact can check this, or grant you
   sandbox dashboard access as an `assetco_admin`).
4. Once you're confident, let CEF know — they'll move your AssetCo through the pipeline stages and
   eventually issue production credentials.

## 6. Support

Questions during integration go to your CEF onboarding contact — not a public support channel.
