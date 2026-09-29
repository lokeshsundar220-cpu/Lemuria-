const { Otp } = require('../models');
const { generate6DigitOTP } = require('../utils/otpGenerator');
const { sendOTPEmail } = require('../utils/emailService');

class OTPService {
  /**
   * Generate, save, and send a 6-digit email OTP (5 min validity)
   */
  async sendOTP(email, purpose = 'LOGIN') {
    const cleanEmail = email.toLowerCase().trim();

    // Check resend limit/cooldown (protect against spamming within 30s)
    const recentOtp = await Otp.findOne({
      email: cleanEmail,
      purpose,
      createdAt: { $gte: new Date(Date.now() - 30 * 1000) }
    });

    if (recentOtp) {
      throw new Error('Please wait 30 seconds before requesting another verification code.');
    }

    // Invalidate previous unverified OTPs for this email and purpose
    await Otp.deleteMany({ email: cleanEmail, purpose });

    const code = generate6DigitOTP();
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const otpDoc = await Otp.create({
      email: cleanEmail,
      otpCode: code,
      purpose,
      expiresAt,
      isVerified: false,
      attempts: 0
    });

    // Send email asynchronously
    await sendOTPEmail(cleanEmail, code, purpose);

    return {
      success: true,
      message: `Verification code sent to ${cleanEmail}`,
      expiresAt: otpDoc.expiresAt
    };
  }

  /**
   * Verify an OTP for an email
   */
  async verifyOTP(email, code, purpose = 'LOGIN') {
    const cleanEmail = email.toLowerCase().trim();

    const otpDoc = await Otp.findOne({
      email: cleanEmail,
      purpose,
      isVerified: false
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      throw new Error('No active verification code found. Please request a new code.');
    }

    if (new Date() > otpDoc.expiresAt) {
      await Otp.findByIdAndDelete(otpDoc._id);
      throw new Error('Verification code has expired. Please request a new code.');
    }

    if (otpDoc.attempts >= 5) {
      await Otp.findByIdAndDelete(otpDoc._id);
      throw new Error('Too many failed attempts. Please request a new code.');
    }

    if (otpDoc.otpCode !== code.trim()) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      throw new Error('Invalid verification code. Please check and try again.');
    }

    // One-time verification: mark verified and then delete
    otpDoc.isVerified = true;
    await otpDoc.save();
    await Otp.findByIdAndDelete(otpDoc._id);

    return true;
  }
}

module.exports = new OTPService();
