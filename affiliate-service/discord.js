const { formatCents } = require('./lib/money');

async function sendConversionAlert({ affiliateName, productType, amountTotalCents, commissionCents }) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[discord] DISCORD_WEBHOOK_URL not set, skipping conversion alert');
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: `New affiliate sale via **${affiliateName}** — ${productType} (${formatCents(amountTotalCents)}), commission ${formatCents(commissionCents)}`,
      }),
    });
  } catch (err) {
    console.error(`[discord] failed to send conversion alert: ${err.message}`);
  }
}

module.exports = { sendConversionAlert };
