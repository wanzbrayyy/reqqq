const crypto = require('crypto');

function generateMagicToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { generateMagicToken };