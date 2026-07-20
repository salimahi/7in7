# affiliate-service

Always-on Node service, deployed to Railway independently of the write7in7.com static site
(sibling to `reddit-capi-service`).

Creates Stripe Checkout Sessions server-side so both a Reddit click ID (`client_reference_id`,
untouched — still consumed separately by `reddit-capi-service`) and an affiliate code
(`metadata.aff_code`) can ride along as distinct fields. Records affiliate clicks and Stripe
conversions in Postgres, posts a Discord alert per affiliate sale, and serves two read-only
report pages: an admin dashboard (Basic Auth) and a per-affiliate link.

## Environment variables (set in Railway's dashboard, never committed)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Auto-injected by Railway's Postgres plugin. |
| `STRIPE_SECRET_KEY` | yes | Used to create Checkout Sessions via the Stripe API. |
| `STRIPE_WEBHOOK_SECRET` | yes | Signing secret from this service's own Stripe webhook endpoint (separate from `reddit-capi-service`'s). |
| `STRIPE_PRICE_REGISTER_SINGLE` | yes | Stripe Price ID for the single-cycle registration ($25, one-time). |
| `STRIPE_PRICE_LATE_ENTRY` | yes | Stripe Price ID for late entry ($35, one-time). |
| `STRIPE_PRICE_SUBSCRIPTION_ANNUAL` | yes | Stripe Price ID for the annual subscription ($240/yr, recurring). |
| `COMMISSION_CENTS_REGISTER_SINGLE` | yes | Flat commission (cents) per single-cycle sale. |
| `COMMISSION_CENTS_LATE_ENTRY` | yes | Flat commission (cents) per late-entry sale. |
| `COMMISSION_CENTS_SUBSCRIPTION_ANNUAL` | yes | Flat commission (cents) per annual-subscription sale. |
| `DISCORD_WEBHOOK_URL` | no | Incoming webhook for the private sales-alert channel. If unset, conversion alerts are logged and skipped rather than failing the request. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | yes | Basic Auth credentials for `/admin`. |
| `ALLOWED_ORIGIN` | yes | `https://write7in7.com` — CORS allow-list for `/clicks` and `/checkout-sessions`. |
| `PORT` | no | Provided automatically by Railway. |

## Routes

- `POST /clicks` — `{ refCode, landingPage, referrer }`. Always responds `204`; unknown ref codes are silently ignored.
- `POST /checkout-sessions` — `{ productType, affCode, rdtCid }`. Returns `{ url }` to redirect the browser to.
- `POST /webhooks/stripe` — Stripe's `checkout.session.completed` webhook. Idempotent on `stripe_session_id`.
- `GET /admin`, `POST /admin/affiliates`, `POST /admin/payouts`, `GET /admin/export.csv` — Basic Auth.
- `GET /a/:report_token` — no auth; the token is the credential.

## Manual setup checklist

**Stripe Dashboard**
1. Confirm/collect the three Price IDs above (Products, or each Buy Button's config in the old setup). Annual must be a recurring Price; the other two must be one-time Prices.
2. Create equivalent test-mode Prices for pre-launch testing.
3. Add a second webhook endpoint → `https://<this-service>.up.railway.app/webhooks/stripe`, subscribed to `checkout.session.completed` only, and copy its signing secret into `STRIPE_WEBHOOK_SECRET`. `reddit-capi-service`'s existing webhook endpoint is untouched — Stripe fans the same event out to both independently.

**Railway**
4. New service in the same project as `reddit-capi-service`, root directory `affiliate-service`. Attach a Postgres plugin (auto-injects `DATABASE_URL`). Set all env vars above.

**Discord**
5. Create an incoming webhook on the target private channel; copy the URL into `DISCORD_WEBHOOK_URL` (can be added later — the service runs fine without it, it just skips the alert).

**Ongoing (once `/admin` is live)**
6. Add each affiliate via the dashboard; hand them `https://write7in7.com/register.html?aff=<ref_code>` and their private report link `https://<this-service-domain>/a/<report_token>`.

## Local testing

```
npm install
stripe listen --forward-to localhost:3000/webhooks/stripe
```

Use the webhook signing secret the Stripe CLI prints for `STRIPE_WEBHOOK_SECRET` locally, then
trigger a test event:

```
stripe trigger checkout.session.completed
```

To exercise session creation directly:

```
curl -X POST localhost:3000/checkout-sessions \
  -H "Content-Type: application/json" \
  -d '{"productType":"register_single","affCode":"TESTCODE","rdtCid":""}'
```
