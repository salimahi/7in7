const express = require('express');
const cors = require('cors');
const stripe = require('../stripe');
const { PRODUCT_CONFIG, SITE_URL } = require('../config');

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
      allow_promotion_codes: true,
      consent_collection: { terms_of_service: 'required' },
      custom_text: {
        terms_of_service_acceptance: {
          message:
            "If you win a monthly cycle, or if the Organizer otherwise selects your script, you grant " +
            'Write 7 in 7 a license to produce and publicly distribute a recorded table read of your ' +
            'script as a podcast episode, performed by voice actors, and to keep that episode available ' +
            'and promote it. You keep full ownership and copyright in your script. You also confirm your ' +
            "script is your own original work and does not infringe anyone else's rights.\n\n" +
            'I have read and agree to the above disclaimer as well as the Write 7 in 7 ' +
            `[Terms & Conditions](${SITE_URL}/terms.html) and [Privacy Policy](${SITE_URL}/privacy.html).`,
        },
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
