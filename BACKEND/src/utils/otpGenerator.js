const crypto = require('crypto');

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
const generate6DigitOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

module.exports = {
  generate6DigitOTP
};
