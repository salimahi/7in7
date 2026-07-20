const express = require('express');
const db = require('./db');
const clicksRoute = require('./routes/clicks');
const checkoutSessionsRoute = require('./routes/checkoutSessions');
const webhookRoute = require('./routes/webhook');
const adminRoute = require('./routes/admin');
const reportRoute = require('./routes/report');

const app = express();

app.use(webhookRoute); // must be mounted before any express.json() body parsing
app.use(clicksRoute);
app.use(checkoutSessionsRoute);
app.use(adminRoute);
app.use(reportRoute);

const PORT = process.env.PORT || 3000;

db.runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`affiliate-service listening on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error(`[server] failed to run migrations: ${err.message}`);
    process.exit(1);
  });
