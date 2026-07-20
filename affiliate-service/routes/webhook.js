const express = require('express');
const stripe = require('../stripe');
const db = require('../db');
const { PRODUCT_CONFIG } = require('../config');
const { sendConversionAlert } = require('../discord');

const router = express.Router();

router.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    let event;
    try {
      const signature = req.headers['stripe-signature'];
      event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error(`[webhook] signature verification failed: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    res.status(200).json({ received: true });

    if (event.type !== 'checkout.session.completed') return;

    const session = event.data.object;

    try {
      const productType = session.metadata && session.metadata.product_type;
      const affCode = session.metadata && session.metadata.aff_code;
      const product = PRODUCT_CONFIG[productType];

      if (!product) {
        console.error(`[webhook] unknown product_type "${productType}" on session ${session.id}`);
        return;
      }

      const customerEmail = (session.customer_details && session.customer_details.email) || null;

      let affiliateId = null;
      let affiliateName = null;
      if (affCode) {
        let isReturningCustomer = false;
        if (customerEmail) {
          const { rows: priorRows } = await db.query(
            'SELECT 1 FROM conversions WHERE lower(customer_email) = lower($1) LIMIT 1',
            [customerEmail]
          );
          isReturningCustomer = priorRows.length > 0;
        }

        if (!isReturningCustomer) {
          const { rows } = await db.query(
            'SELECT id, name FROM affiliates WHERE ref_code = $1',
            [affCode]
          );
          if (rows.length > 0) {
            affiliateId = rows[0].id;
            affiliateName = rows[0].name;
          }
        }
      }

      const { rows: inserted } = await db.query(
        `INSERT INTO conversions
           (affiliate_id, stripe_session_id, product_type, amount_total_cents, commission_cents, customer_email)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (stripe_session_id) DO NOTHING
         RETURNING id`,
        [
          affiliateId,
          session.id,
          productType,
          session.amount_total,
          product.commissionCents,
          customerEmail,
        ]
      );

      if (inserted.length > 0 && affiliateId) {
        await sendConversionAlert({
          affiliateName,
          productType,
          amountTotalCents: session.amount_total,
          commissionCents: product.commissionCents,
        });
      }
    } catch (err) {
      console.error(`[webhook] failed to process session ${session.id}: ${err.message}`);
    }
  }
);

module.exports = router;
