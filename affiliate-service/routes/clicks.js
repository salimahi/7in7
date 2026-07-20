const express = require('express');
const cors = require('cors');
const db = require('../db');

const router = express.Router();

router.use(cors({ origin: process.env.ALLOWED_ORIGIN }));

router.post('/', express.json(), async (req, res) => {
  const { refCode, landingPage, referrer } = req.body || {};

  res.status(204).end();

  if (!refCode) return;

  try {
    const { rows } = await db.query('SELECT id FROM affiliates WHERE ref_code = $1', [refCode]);
    if (rows.length === 0) return;

    await db.query(
      'INSERT INTO clicks (affiliate_id, landing_page, referrer) VALUES ($1, $2, $3)',
      [rows[0].id, landingPage || null, referrer || null]
    );
  } catch (err) {
    console.error(`[clicks] failed to record click for refCode ${refCode}: ${err.message}`);
  }
});

module.exports = router;
