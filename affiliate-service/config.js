const SITE_URL = 'https://write7in7.com';

const PRODUCT_CONFIG = {
  register_single: {
    priceId: process.env.STRIPE_PRICE_REGISTER_SINGLE,
    mode: 'payment',
    commissionCents: parseInt(process.env.COMMISSION_CENTS_REGISTER_SINGLE, 10),
    successUrl: `${SITE_URL}/register.html?checkout=success`,
    cancelUrl: `${SITE_URL}/register.html?checkout=cancelled`,
  },
  late_entry: {
    priceId: process.env.STRIPE_PRICE_LATE_ENTRY,
    mode: 'payment',
    commissionCents: parseInt(process.env.COMMISSION_CENTS_LATE_ENTRY, 10),
    successUrl: `${SITE_URL}/prompts.html?checkout=success`,
    cancelUrl: `${SITE_URL}/prompts.html?checkout=cancelled`,
  },
  subscription_annual: {
    priceId: process.env.STRIPE_PRICE_SUBSCRIPTION_ANNUAL,
    mode: 'subscription',
    commissionCents: parseInt(process.env.COMMISSION_CENTS_SUBSCRIPTION_ANNUAL, 10),
    successUrl: `${SITE_URL}/register.html?checkout=success`,
    cancelUrl: `${SITE_URL}/register.html?checkout=cancelled`,
  },
};

module.exports = { PRODUCT_CONFIG };
