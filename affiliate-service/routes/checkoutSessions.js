const express = require('express');
const cors = require('cors');
const stripe = require('../stripe');
const { PRODUCT_CONFIG } = require('../config');

const router = express.Router();

router.use(cors({ origin: process.env.ALLOWED_ORIGIN }));

router.post('/', express.json(), async (req, res) => {
  const { productType, affCode, rdtCid } = req.body || {};

  const product = PRODUCT_CONFIG[productType];
  if (!product) {
    res.status(400).json({ error: 'invalid productType' });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: product.mode,
      line_items: [{ price: product.priceId, quantity: 1 }],
      client_reference_id: rdtCid || undefined,
      metadata: {
        aff_code: affCode || '',
        product_type: productType,
      },
      success_url: product.successUrl,
      cancel_url: product.cancelUrl,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(`[checkout-sessions] failed to create session for ${productType}: ${err.message}`);
    res.status(500).json({ error: 'failed to create checkout session' });
  }
});

module.exports = router;
