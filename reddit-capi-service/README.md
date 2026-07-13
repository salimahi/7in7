# reddit-capi-service

Small always-on Node service, deployed to Railway independently of the write7in7.com static site.

Listens for Stripe's `checkout.session.completed` webhook, hashes the customer's email/phone,
and sends a server-side Purchase conversion to Reddit's Conversions API (CAPI) — this is how
Reddit gets Customer Match keys for purchases even though the site itself is static and has no
customer data of its own.

## Environment variables (set in Railway's dashboard, never committed)

| Variable | Required | Description |
|---|---|---|
| `STRIPE_WEBHOOK_SECRET` | yes | Signing secret from the Stripe Dashboard webhook endpoint (Developers → Webhooks). |
| `REDDIT_PIXEL_ID` | yes | From Reddit Events Manager → Configure data source → Reddit Pixel. |
| `REDDIT_CONVERSION_ACCESS_TOKEN` | yes | From Reddit Events Manager → Conversions API → Generate Access Token. Cannot be retrieved again once generated. |
| `REDDIT_TEST_ID` | no | Only set while verifying in Reddit's Test Events view (maps to the API's `data.test_id` field); unset in production. |
| `STRIPE_SECRET_KEY` | no | Not currently used for any Stripe API call (the webhook payload has everything needed) — only add this if a future change needs to call back to Stripe. |
| `PORT` | no | Provided automatically by Railway. |

## Stripe Dashboard setup

1. Deploy this service to Railway and note its public URL.
2. Stripe Dashboard → Developers → Webhooks → Add endpoint → `https://<railway-service>.up.railway.app/webhooks/stripe`.
3. Restrict it to the `checkout.session.completed` event only.
4. Copy the generated signing secret into Railway's `STRIPE_WEBHOOK_SECRET`.

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

Check the console output for the Reddit CAPI response.
