const express = require('express');
const db = require('../db');
const basicAuth = require('../auth');
const { generateRefCode, generateReportToken } = require('../lib/refCode');
const { formatCents } = require('../lib/money');

const router = express.Router();

router.use(basicAuth);

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function fetchAffiliates() {
  const { rows } = await db.query(`
    SELECT
      a.id, a.name, a.ref_code, a.report_token, a.email, a.created_at,
      COALESCE(clicks.count, 0)::int AS click_count,
      COALESCE(conv.count, 0)::int AS conversion_count,
      COALESCE(conv.earned_cents, 0)::int AS earned_cents,
      COALESCE(payouts.paid_cents, 0)::int AS paid_cents
    FROM affiliates a
    LEFT JOIN (SELECT affiliate_id, COUNT(*) AS count FROM clicks GROUP BY affiliate_id) clicks
      ON clicks.affiliate_id = a.id
    LEFT JOIN (SELECT affiliate_id, COUNT(*) AS count, SUM(commission_cents) AS earned_cents FROM conversions GROUP BY affiliate_id) conv
      ON conv.affiliate_id = a.id
    LEFT JOIN (SELECT affiliate_id, SUM(amount_cents) AS paid_cents FROM payouts GROUP BY affiliate_id) payouts
      ON payouts.affiliate_id = a.id
    ORDER BY a.created_at DESC
  `);
  return rows;
}

function renderAdminPage(affiliates) {
  const rows = affiliates.map(a => {
    const balanceCents = a.earned_cents - a.paid_cents;
    return `
      <tr>
        <td>${escHtml(a.name)}</td>
        <td>${escHtml(a.ref_code)}</td>
        <td><a href="/a/${escHtml(a.report_token)}">${escHtml(a.report_token)}</a></td>
        <td>${a.click_count}</td>
        <td>${a.conversion_count}</td>
        <td>${formatCents(a.earned_cents)}</td>
        <td>${formatCents(a.paid_cents)}</td>
        <td>${formatCents(balanceCents)}</td>
      </tr>`;
  }).join('');

  const affiliateOptions = affiliates
    .map(a => `<option value="${a.id}">${escHtml(a.name)}</option>`)
    .join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Affiliate Admin</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #222; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 2rem; }
    th, td { border: 1px solid #ccc; padding: 0.5rem 0.75rem; text-align: left; font-size: 0.9rem; }
    th { background: #f4f4f4; }
    form { display: inline-block; margin-right: 2rem; vertical-align: top; }
    label { display: block; margin-bottom: 0.5rem; font-size: 0.85rem; }
    input, select { display: block; margin-top: 0.2rem; padding: 0.3rem; }
    button { margin-top: 0.75rem; padding: 0.4rem 1rem; }
    h1 { font-size: 1.4rem; } h2 { font-size: 1.1rem; }
  </style>
</head>
<body>
  <h1>Affiliate Admin</h1>
  <p><a href="/admin/export.csv">Download CSV export</a></p>

  <table>
    <thead>
      <tr>
        <th>Name</th><th>Ref code</th><th>Report link</th><th>Clicks</th>
        <th>Conversions</th><th>Earned</th><th>Paid</th><th>Balance due</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="8">No affiliates yet</td></tr>'}</tbody>
  </table>

  <h2>Add affiliate</h2>
  <form method="post" action="/admin/affiliates">
    <label>Name <input type="text" name="name" required /></label>
    <label>Email <input type="email" name="email" /></label>
    <button type="submit">Add</button>
  </form>

  <h2>Record payout</h2>
  <form method="post" action="/admin/payouts">
    <label>Affiliate
      <select name="affiliateId" required>${affiliateOptions}</select>
    </label>
    <label>Amount (USD) <input type="number" name="amount" step="0.01" min="0.01" required /></label>
    <label>Note <input type="text" name="note" /></label>
    <button type="submit">Record</button>
  </form>
</body>
</html>`;
}

router.get('/admin', async (req, res) => {
  const affiliates = await fetchAffiliates();
  res.set('Cache-Control', 'no-store').send(renderAdminPage(affiliates));
});

router.post('/admin/affiliates', express.urlencoded({ extended: false }), async (req, res) => {
  const { name, email } = req.body || {};
  if (!name) {
    res.status(400).send('name is required');
    return;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const refCode = generateRefCode();
    const reportToken = generateReportToken();
    try {
      await db.query(
        'INSERT INTO affiliates (name, ref_code, report_token, email) VALUES ($1, $2, $3, $4)',
        [name, refCode, reportToken, email || null]
      );
      res.redirect('/admin');
      return;
    } catch (err) {
      if (err.code === '23505') continue; // ref_code or report_token collision, retry
      console.error(`[admin] failed to create affiliate: ${err.message}`);
      res.status(500).send('failed to create affiliate');
      return;
    }
  }
  res.status(500).send('failed to generate a unique ref code, try again');
});

router.post('/admin/payouts', express.urlencoded({ extended: false }), async (req, res) => {
  const { affiliateId, amount, note } = req.body || {};
  const amountCents = Math.round(parseFloat(amount) * 100);

  if (!affiliateId || !Number.isFinite(amountCents) || amountCents <= 0) {
    res.status(400).send('affiliateId and a positive amount are required');
    return;
  }

  await db.query(
    'INSERT INTO payouts (affiliate_id, amount_cents, note) VALUES ($1, $2, $3)',
    [affiliateId, amountCents, note || null]
  );
  res.redirect('/admin');
});

router.get('/admin/export.csv', async (req, res) => {
  const { rows } = await db.query(`
    SELECT c.created_at, a.name AS affiliate_name, a.ref_code, c.product_type,
           c.amount_total_cents, c.commission_cents, c.customer_email, c.stripe_session_id
    FROM conversions c
    LEFT JOIN affiliates a ON a.id = c.affiliate_id
    ORDER BY c.created_at DESC
  `);

  const header = 'created_at,affiliate_name,ref_code,product_type,amount_total_cents,commission_cents,customer_email,stripe_session_id';
  const csvEscape = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const lines = rows.map(r => [
    r.created_at.toISOString(), r.affiliate_name, r.ref_code, r.product_type,
    r.amount_total_cents, r.commission_cents, r.customer_email, r.stripe_session_id,
  ].map(csvEscape).join(','));

  res.set('Content-Type', 'text/csv').set('Content-Disposition', 'attachment; filename="conversions.csv"');
  res.send([header, ...lines].join('\n'));
});

module.exports = router;
