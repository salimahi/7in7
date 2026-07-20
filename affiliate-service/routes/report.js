const express = require('express');
const db = require('../db');
const { formatCents } = require('../lib/money');

const router = express.Router();

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const PRODUCT_LABELS = {
  register_single: 'Single Cycle Entry',
  late_entry: 'Late Entry',
  subscription_annual: 'Annual Subscription',
};

router.get('/a/:report_token', async (req, res) => {
  const { report_token } = req.params;

  const { rows: affiliateRows } = await db.query(
    'SELECT id, name FROM affiliates WHERE report_token = $1',
    [report_token]
  );

  res.set('Cache-Control', 'no-store');

  if (affiliateRows.length === 0) {
    res.status(404).send('Not found');
    return;
  }

  const affiliate = affiliateRows[0];

  const { rows: clickRows } = await db.query(
    'SELECT COUNT(*)::int AS count FROM clicks WHERE affiliate_id = $1',
    [affiliate.id]
  );

  const { rows: byProduct } = await db.query(
    `SELECT product_type, COUNT(*)::int AS count, SUM(commission_cents)::int AS earned_cents
     FROM conversions WHERE affiliate_id = $1 GROUP BY product_type`,
    [affiliate.id]
  );

  const { rows: paidRows } = await db.query(
    'SELECT COALESCE(SUM(amount_cents), 0)::int AS paid_cents FROM payouts WHERE affiliate_id = $1',
    [affiliate.id]
  );

  const totalEarnedCents = byProduct.reduce((sum, r) => sum + r.earned_cents, 0);
  const paidCents = paidRows[0].paid_cents;
  const balanceCents = totalEarnedCents - paidCents;

  const breakdownRows = byProduct.map(r => `
    <tr>
      <td>${escHtml(PRODUCT_LABELS[r.product_type] || r.product_type)}</td>
      <td>${r.count}</td>
      <td>${formatCents(r.earned_cents)}</td>
    </tr>`).join('');

  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escHtml(affiliate.name)} — Affiliate Report</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #222; max-width: 640px; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ccc; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #f4f4f4; }
    .stat { font-size: 1.1rem; margin: 0.3rem 0; }
  </style>
</head>
<body>
  <h1>${escHtml(affiliate.name)}</h1>
  <p class="stat">Clicks: ${clickRows[0].count}</p>
  <table>
    <thead><tr><th>Product</th><th>Conversions</th><th>Earned</th></tr></thead>
    <tbody>${breakdownRows || '<tr><td colspan="3">No conversions yet</td></tr>'}</tbody>
  </table>
  <p class="stat">Total earned: ${formatCents(totalEarnedCents)}</p>
  <p class="stat">Total paid: ${formatCents(paidCents)}</p>
  <p class="stat"><strong>Balance due: ${formatCents(balanceCents)}</strong></p>
</body>
</html>`);
});

module.exports = router;
