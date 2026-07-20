const crypto = require('crypto');

const REF_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

function generateRefCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += REF_CODE_ALPHABET[crypto.randomInt(REF_CODE_ALPHABET.length)];
  }
  return code;
}

function generateReportToken() {
  return crypto.randomBytes(24).toString('base64url');
}

module.exports = { generateRefCode, generateReportToken };
