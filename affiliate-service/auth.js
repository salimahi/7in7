const crypto = require('crypto');

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function basicAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    const username = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);

    if (
      timingSafeEqual(username, process.env.ADMIN_USERNAME || '') &&
      timingSafeEqual(password, process.env.ADMIN_PASSWORD || '')
    ) {
      return next();
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="affiliate-service admin"');
  res.status(401).send('Authentication required');
}

module.exports = basicAuth;
