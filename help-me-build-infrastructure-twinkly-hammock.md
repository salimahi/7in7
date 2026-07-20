# Affiliate link tracking, Stripe attribution, and payout reporting

## Context

write7in7.com currently sells three products through embedded Stripe Buy Buttons / a raw Payment Link (no server-side checkout code at all): single-cycle registration ($25), late entry ($35), and an annual subscription ($240/yr). A sibling Railway service, `reddit-capi-service`, already listens to Stripe's `checkout.session.completed` webhook to forward purchases to Reddit's Conversions API, and identifies which of the three products was bought by matching `session.amount_total` against a hardcoded cents table. It also relies on `session.client_reference_id` to carry a Reddit click ID captured client-side via `js/reddit-attribution.js` (URL param → `localStorage` → stamped onto the Buy Buttons).

The user wants to launch an affiliate program: generate trackable links for affiliates, know when a link leads to a real Stripe purchase (and which of the three product types), get notified immediately, and have both the user and each affiliate be able to see running totals for payout purposes.

Because `client_reference_id` is already claimed by the Reddit pixel integration, there's no free passthrough field on the current static Buy Button / Payment Link setup to also carry an affiliate code. After discussing the tradeoffs, the user chose the most robust (if larger) option: **replace the client-side Buy Buttons/Payment Link with a small server-side "create Checkout Session" endpoint** on a new Railway service, so both the Reddit click ID and the affiliate code can ride along as distinct, first-class fields (`client_reference_id` stays exactly as-is for Reddit; a new `metadata.aff_code` + `metadata.product_type` carry the affiliate data). This also removes the need to guess product type by dollar amount for the new service, since the server sets it explicitly at session-creation time.

Data lands in a new Railway-provisioned Postgres database. The user gets notified per affiliate sale via a Discord webhook (they already run a community Discord). Commission is a flat fee per product type (not a %, not per-affiliate custom rates), configured via env vars. Reporting is two simple server-rendered pages: an admin dashboard (Basic Auth) for the user, and an unguessable per-affiliate link (`/a/:token`) each affiliate can bookmark to see their own stats — no login system needed for either.

## New service: `affiliate-service/` (sibling to `reddit-capi-service/`)

Follows the existing repo's conventions exactly: plain Express 4, no ORM, Node ≥18 (global `fetch`), no framework, env vars documented in a README table and set only in Railway's dashboard (no `.env.example`, nothing committed), no `railway.json`/Procfile (Railway auto-detects via `package.json`).

```
affiliate-service/
├── package.json          # express, stripe, pg, cors
├── .gitignore             # node_modules/, .env
├── README.md              # env var table + Stripe/Railway/Discord setup steps
├── server.js              # app wiring, route mounting, listen()
├── db.js                  # pg Pool + query() + runMigrations() (CREATE TABLE IF NOT EXISTS)
├── config.js              # PRODUCT_CONFIG: product_type -> { priceId, mode, commissionCents }
├── stripe.js              # Stripe client init
├── discord.js             # sendConversionAlert()
├── auth.js                # timing-safe Basic Auth middleware for /admin
├── routes/
│   ├── clicks.js          # POST /clicks
│   ├── checkoutSessions.js # POST /checkout-sessions
│   ├── webhook.js          # POST /webhooks/stripe
│   ├── admin.js             # GET /admin, POST /admin/affiliates, POST /admin/payouts, GET /admin/export.csv
│   └── report.js            # GET /a/:report_token
└── lib/
    ├── refCode.js          # generateRefCode(), generateReportToken()
    └── money.js            # cents-formatting helpers
```

### Schema (raw SQL, run as `CREATE TABLE IF NOT EXISTS` on startup — no migration framework)

```sql
CREATE TABLE IF NOT EXISTS affiliates (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  ref_code      TEXT NOT NULL UNIQUE,      -- public, used in ?aff=<ref_code>
  report_token  TEXT NOT NULL UNIQUE,      -- secret, used in /a/:token
  email         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clicks (
  id            SERIAL PRIMARY KEY,
  affiliate_id  INTEGER NOT NULL REFERENCES affiliates(id),
  landing_page  TEXT,
  referrer      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversions (
  id                 SERIAL PRIMARY KEY,
  affiliate_id       INTEGER REFERENCES affiliates(id),      -- nullable: non-affiliate sale
  stripe_session_id  TEXT NOT NULL UNIQUE,                    -- idempotency key
  product_type       TEXT NOT NULL,                           -- register_single | late_entry | subscription_annual
  amount_total_cents INTEGER NOT NULL,
  commission_cents   INTEGER NOT NULL,
  customer_email     TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payouts (
  id            SERIAL PRIMARY KEY,
  affiliate_id  INTEGER NOT NULL REFERENCES affiliates(id),
  amount_cents  INTEGER NOT NULL,
  note          TEXT,
  paid_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clicks_affiliate_id      ON clicks (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_conversions_affiliate_id ON conversions (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payouts_affiliate_id     ON payouts (affiliate_id);
```

### Routes

- **`POST /clicks`** — body `{ refCode, landingPage, referrer }`. Look up `affiliates.ref_code`; if found, insert a `clicks` row; respond `204` either way (unknown codes are silently ignored, never an error). CORS-restricted to `ALLOWED_ORIGIN`.
- **`POST /checkout-sessions`** — body `{ productType, affCode, rdtCid }`. Validate `productType` against `PRODUCT_CONFIG`. Create the session via `stripe.checkout.sessions.create({ mode, line_items: [{ price, quantity: 1 }], client_reference_id: rdtCid || undefined, metadata: { aff_code: affCode || '', product_type: productType }, success_url, cancel_url })`. `mode` is `'payment'` for single/late, `'subscription'` for annual. `success_url`/`cancel_url` are picked server-side from a fixed map keyed by `productType` — **never** taken from client input (avoids an open-redirect vector). Respond `{ url: session.url }`; frontend redirects the browser there directly, no Stripe.js needed.
- **`POST /webhooks/stripe`** — mirrors `reddit-capi-service/server.js`'s pattern exactly: `express.raw()` + `stripe.webhooks.constructEvent`, respond `200` fast, only handle `checkout.session.completed`. Reads `session.metadata.product_type` / `session.metadata.aff_code` (not amount-based guessing — the server already knows what it created). Look up `affiliate_id` by `ref_code`; compute `commission_cents` from `PRODUCT_CONFIG`; `INSERT INTO conversions (...) ON CONFLICT (stripe_session_id) DO NOTHING RETURNING id`. **Only** send the Discord alert if a row was actually newly inserted (guards against Stripe webhook retries double-notifying) and only if `affiliate_id` is non-null (no ping for direct, non-affiliate sales).
- **`GET /admin`, `POST /admin/affiliates`, `POST /admin/payouts`, `GET /admin/export.csv`** — behind Basic Auth (`ADMIN_USERNAME`/`ADMIN_PASSWORD`, timing-safe compare). Dashboard lists every affiliate with clicks, conversions, total earned (`SUM(commission_cents)`), total paid (`SUM(payouts.amount_cents)`), balance due; a form to add a new affiliate (auto-generates `ref_code` + `report_token`); a form to record a payout per affiliate. CSV export for bookkeeping.
- **`GET /a/:report_token`** — no auth, the token itself is the credential. Read-only page: affiliate name, clicks, conversions broken down by product type, total earned, total paid, balance due. `Cache-Control: no-store`.

### Config (`config.js`) — single map driving both checkout creation and commission math

```js
const PRODUCT_CONFIG = {
  register_single:     { priceId: process.env.STRIPE_PRICE_REGISTER_SINGLE,     mode: 'payment',      commissionCents: parseInt(process.env.COMMISSION_CENTS_REGISTER_SINGLE, 10) },
  late_entry:           { priceId: process.env.STRIPE_PRICE_LATE_ENTRY,          mode: 'payment',      commissionCents: parseInt(process.env.COMMISSION_CENTS_LATE_ENTRY, 10) },
  subscription_annual:  { priceId: process.env.STRIPE_PRICE_SUBSCRIPTION_ANNUAL, mode: 'subscription', commissionCents: parseInt(process.env.COMMISSION_CENTS_SUBSCRIPTION_ANNUAL, 10) },
};
```

Annual commission is paid once at signup, not tracked per renewal (matches the chosen flat-fee-per-conversion-type model; recurring-renewal commission tracking is out of scope).

### Env vars (README table, Railway dashboard only)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Auto-injected by Railway's Postgres plugin |
| `STRIPE_SECRET_KEY` | Creates Checkout Sessions (unlike reddit-capi-service, this is actually used for API calls) |
| `STRIPE_WEBHOOK_SECRET` | This service's own webhook endpoint secret (separate from reddit-capi-service's) |
| `STRIPE_PRICE_REGISTER_SINGLE` / `STRIPE_PRICE_LATE_ENTRY` / `STRIPE_PRICE_SUBSCRIPTION_ANNUAL` | Stripe Price IDs (see manual setup) |
| `COMMISSION_CENTS_REGISTER_SINGLE` / `COMMISSION_CENTS_LATE_ENTRY` / `COMMISSION_CENTS_SUBSCRIPTION_ANNUAL` | Flat commission per product type, in cents |
| `DISCORD_WEBHOOK_URL` | Incoming webhook for the private sales-alert channel |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Basic Auth for `/admin` |
| `ALLOWED_ORIGIN` | `https://write7in7.com` — CORS allow-list |
| `PORT` | Railway-provided |

## Frontend changes (static site)

- **`js/reddit-attribution.js`** — strip the `DOMContentLoaded` block that stamps `client-reference-id` onto DOM elements (those elements go away). Keep the URL-capture + `localStorage` + `window.W7I7Attribution.getStoredClickId()` export untouched — `checkout.js` reads it directly instead.
- **New `js/affiliate-attribution.js`** — same shape as reddit-attribution.js: capture `?aff=` into `localStorage['w7i7_aff_code']`, and **only when freshly present in the URL** (not replayed from storage) fire a `fetch(..., { keepalive: true })` POST to `/clicks` (avoid `sendBeacon`'s JSON content-type quirk). Exposes `window.W7I7AffAttribution.getStoredAffCode()`.
- **New `js/checkout.js`** — event-delegated click listener on `[data-checkout-product]` buttons (must be delegated, not bound at load time, since `prompts.js` renders its buttons dynamically). On click: POST to `/checkout-sessions` with `{ productType, affCode, rdtCid }`, redirect to the returned `url`. Also checks for `?checkout=success|cancelled` on load to show/hide an inline confirmation banner (no dedicated thank-you page exists today).
- **New `js/config.js`** — single `window.W7I7_CONFIG = { affiliateServiceUrl: '...' }`, referenced by both new scripts, so the Railway URL lives in one place.
- **`register.html`** — remove the `buy-button.js` script tag and both `<stripe-buy-button>` elements (lines ~178-196); replace with plain `<button data-checkout-product="register_single">`/`"subscription_annual"`. The `.stripe-option-label/-price/-desc/-savings` CSS classes already exist in this file's `<style>` block (lines 102-132) but are currently **unused** — Stripe's Buy Button widget renders its own price/copy from Stripe's dashboard config, invisible in this repo. Before writing replacement markup, pull up each Buy Button's config in the Stripe Dashboard to see the exact price/label/savings copy to replicate, or confirm reasonable copy with the user (Single $25 / Annual $240 "Best Value" is already known from `terms.html`). Add the three new script tags alongside the existing ones.
- **`js/prompts.js`** (`buildCurrentSection()`, lines 119-136) — same button swap for late entry + annual inside the `.late-entry-callout` template; drop the `${clickId ? ... : ''}` interpolation entirely (checkout.js reads the click ID at request time). Check whether `clickId` (declared line 7) is used elsewhere in the file before removing its declaration.
- **`faq.html`** — replace the inline `<a id="late-entry-payment-link" href="https://buy.stripe.com/...">` (line 101) with a `data-checkout-product="late_entry"` control styled to still read as an inline text link (small new `.text-checkout-link` CSS rule in `css/styles.css`), since it sits mid-sentence in FAQ prose.

## Manual setup (outside code — the user needs to do these)

**Stripe Dashboard:**
1. Find each Buy Button's underlying Price ID (Dashboard → Products, or open each Buy Button's config) for the three `STRIPE_PRICE_*` env vars. Confirm the annual one is a recurring Price (required for `mode: 'subscription'`); the other two are one-time Prices (required for `mode: 'payment'`).
2. Create equivalent test-mode Prices for pre-launch testing.
3. Add a second webhook endpoint → `https://<affiliate-service>.up.railway.app/webhooks/stripe`, subscribed to `checkout.session.completed` only, and copy its signing secret into `STRIPE_WEBHOOK_SECRET`. (`reddit-capi-service`'s existing endpoint is untouched — Stripe fans the same event out to both independently.)

**Railway:**
4. New service in the project pointed at `affiliate-service/`. Attach a Postgres plugin (auto-injects `DATABASE_URL`). Set all env vars above.

**Discord:**
5. Create an incoming webhook on the target private channel; copy the URL into `DISCORD_WEBHOOK_URL`.

**Ongoing (once `/admin` is live):**
6. Add each affiliate via the dashboard; hand them `https://write7in7.com/register.html?aff=<ref_code>` and their private report link `https://<affiliate-service-domain>/a/<report_token>`.

## Rollout order (avoid breaking live payments)

1. Build and deploy `affiliate-service` pointed entirely at Stripe **test mode**; nothing on the live site references it yet, so current buy buttons keep working unmodified.
2. Exercise the full loop in test mode: manual `/checkout-sessions` calls for each product type, complete test-card checkouts, confirm webhook → conversion row → correct commission → Discord ping; verify idempotency by re-delivering the same webhook event and confirming no duplicate row/ping.
3. Build and verify `/admin` and `/a/:token` against test data (add affiliate, record payout, verify balance math, verify CSV, verify Basic Auth actually blocks, verify the report page needs the token).
4. Ship `js/affiliate-attribution.js` / `checkout.js` / `config.js` to the static site, but leave the old buy buttons/payment link in place initially — new code paths exist but nothing depends on them yet.
5. Flip the service to live Stripe keys/Price IDs; add the live webhook endpoint.
6. Swap the actual buttons in `register.html`, `js/prompts.js`, and `faq.html` in one deploy, at low traffic; immediately complete one real low-value purchase to confirm the full live path — including confirming `reddit-capi-service`'s existing webhook *also* still fires correctly off the same event.
7. Remove the now-dead `buy-button.js` script tag; ship the simplified `js/reddit-attribution.js`.
8. Account for GitHub Pages' CDN caching delay when verifying each deploy (hard-refresh before concluding something didn't work).
9. Only start distributing real `?aff=` links to affiliates once live traffic is confirmed flowing correctly end-to-end.

## Key risks flagged during design

- **Open redirect**: `success_url`/`cancel_url` must come from a server-side map keyed by validated `productType`, never from client-supplied URLs.
- **Webhook double-counting**: `stripe_session_id UNIQUE` + `ON CONFLICT DO NOTHING`, with the Discord notification gated on "row actually newly inserted," not just "webhook fired."
- **CORS preflight**: `/clicks` and `/checkout-sessions` need proper `OPTIONS` handling for `Access-Control-Allow-Origin` locked to `https://write7in7.com` (not a wildcard).
- **Dynamic DOM in `prompts.js`**: `checkout.js`'s click handling must use event delegation, not direct binding, since the late-entry/annual buttons there are rendered by a template after `checkout.js` loads.
- **`reddit-capi-service` stays untouched**: the new session-creation code must preserve `client_reference_id` semantics exactly and must not alter how `amount_total` is set (Stripe derives it from the Price automatically) — confirmed by design, worth a manual double-check on the first live purchase.

## Verification

- Unit-level: exercise each route with `curl`/Postman against test-mode Stripe locally (`stripe listen --forward-to`), same workflow as `reddit-capi-service/README.md` already documents.
- End-to-end: complete a real test-mode purchase through the actual site (test keys temporarily), confirm a Discord message arrives, a `conversions` row appears with correct `product_type` and `commission_cents`, `/admin` reflects it, and `/a/:token` for the test affiliate reflects it.
- Regression check: confirm `reddit-capi-service` still receives and correctly processes the same `checkout.session.completed` event after the switch to server-created sessions (its existing Reddit CAPI conversion logging must keep working unchanged).
