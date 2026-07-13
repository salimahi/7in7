const REDDIT_PIXEL_ID = process.env.REDDIT_PIXEL_ID;
const REDDIT_CONVERSION_ACCESS_TOKEN = process.env.REDDIT_CONVERSION_ACCESS_TOKEN;
const REDDIT_TEST_ID = process.env.REDDIT_TEST_ID;

async function sendPurchaseConversion({
  eventAtMs,
  clickId,
  hashedEmail,
  hashedPhone,
  externalId,
  ipAddress,
  userAgent,
  currency,
  valueDecimal,
  conversionId,
  itemCount,
  products,
}) {
  const user = {};
  if (hashedEmail) user.email = hashedEmail;
  if (hashedPhone) user.phone_number = hashedPhone;
  if (externalId) user.external_id = externalId;
  if (ipAddress) user.ip_address = ipAddress;
  if (userAgent) user.user_agent = userAgent;

  const body = {
    data: {
      events: [
        {
          event_at: eventAtMs,
          action_source: 'WEBSITE',
          ...(clickId ? { click_id: clickId } : {}),
          type: { tracking_type: 'PURCHASE' },
          user,
          metadata: {
            currency,
            value: valueDecimal,
            conversion_id: conversionId,
            item_count: itemCount || 1,
            ...(products && products.length ? { products } : {}),
          },
        },
      ],
      ...(REDDIT_TEST_ID ? { test_id: REDDIT_TEST_ID } : {}),
    },
  };

  const response = await fetch(
    `https://ads-api.reddit.com/api/v3/pixels/${REDDIT_PIXEL_ID}/conversion_events`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${REDDIT_CONVERSION_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    }
  );

  const responseBody = await response.text();
  console.log(`[reddit-capi] status=${response.status} body=${responseBody}`);

  if (!response.ok) {
    throw new Error(`Reddit CAPI request failed: ${response.status} ${responseBody}`);
  }

  return responseBody;
}

module.exports = { sendPurchaseConversion };
