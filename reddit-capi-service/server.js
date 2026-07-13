const express = require('express');
const Stripe = require('stripe');
const { hashEmail, hashPhone } = require('./hashing');
const { sendPurchaseConversion } = require('./reddit-capi');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_dummy_not_used_for_api_calls');
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const app = express();

// Known fixed prices (Stripe amount_total, in cents) for write7in7.com's live Buy Buttons /
// Payment Link, used to attach product metadata without an extra Stripe API call for line items.
const KNOWN_PRODUCTS_BY_AMOUNT = {
  2500: { id: 'register_single', name: 'Single-Cycle Registration', category: 'Entry Fee' },
  24000: { id: 'subscription_annual', name: 'Annual Subscription', category: 'Entry Fee' },
  3500: { id: 'late_entry', name: 'Late Entry', category: 'Entry Fee' },
};

app.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    let event;
    try {
      const signature = req.headers['stripe-signature'];
      event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error(`[stripe-webhook] signature verification failed: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Acknowledge receipt immediately; don't make Stripe retry over a Reddit-side failure.
    res.status(200).json({ received: true });

    if (event.type !== 'checkout.session.completed') return;

    const session = event.data.object;

    try {
      const externalId =
        typeof session.customer === 'string' ? session.customer : session.customer && session.customer.id;
      const knownProduct = KNOWN_PRODUCTS_BY_AMOUNT[session.amount_total];

      // Reddit's API schema types `metadata.value` as a double "in the base unit of the
      // currency" (e.g. dollars, example 10.99) — Stripe's amount_total is in the minor
      // unit (cents), so it must be divided by 100.
      await sendPurchaseConversion({
        eventAtMs: Date.now(),
        clickId: session.client_reference_id || undefined,
        hashedEmail: hashEmail(session.customer_details && session.customer_details.email),
        hashedPhone: hashPhone(session.customer_details && session.customer_details.phone),
        externalId,
        currency: (session.currency || 'usd').toUpperCase(),
        valueDecimal: session.amount_total / 100,
        conversionId: session.id,
        itemCount: 1,
        products: knownProduct ? [knownProduct] : undefined,
      });
    } catch (err) {
      console.error(`[reddit-capi] failed to send conversion for session ${session.id}: ${err.message}`);
    }
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`reddit-capi-service listening on port ${PORT}`);
});
