const crypto = require('crypto');

function sha256Hex(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function normalizeEmail(email) {
  const lower = email.trim().toLowerCase();
  const atIndex = lower.lastIndexOf('@');
  if (atIndex === -1) return lower.replace(/[^a-z0-9]/g, '');

  let username = lower.slice(0, atIndex);
  const domain = lower.slice(atIndex);

  const plusIndex = username.indexOf('+');
  if (plusIndex !== -1) username = username.slice(0, plusIndex);

  username = username.replace(/[^a-z0-9]/g, '');

  return username + domain;
}

function normalizePhone(phone) {
  const withoutExtension = phone.split(/x|ext/i)[0];
  const digits = withoutExtension.replace(/[^0-9]/g, '');
  return '+' + digits;
}

function hashEmail(email) {
  if (!email) return null;
  return sha256Hex(normalizeEmail(email));
}

function hashPhone(phone) {
  if (!phone) return null;
  return sha256Hex(normalizePhone(phone));
}

module.exports = { sha256Hex, normalizeEmail, normalizePhone, hashEmail, hashPhone };
