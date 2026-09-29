const nodemailer = require('nodemailer');

const createTransporter = () => {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT, 10) || 587;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const rawPass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD;
  const pass = rawPass ? rawPass.trim() : null;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });
};

/**
 * Send OTP Email
 */
const sendOTPEmail = async (toEmail, otpCode, purpose = 'Authentication') => {
  const transporter = createTransporter();
  const fromAddress = process.env.OTP_EMAIL_FROM || `"Lemuria Hotel Services" <${process.env.SMTP_USER || process.env.EMAIL_USER || 'no-reply@lemuria.com'}>`;

  const mailOptions = {
    from: fromAddress,
    to: toEmail,
    subject: `Your Lemuria Verification Code: ${otpCode}`,
    text: `Your Lemuria ${purpose} verification code is ${otpCode}. This code is valid for 5 minutes. Please do not share it with anyone.`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 12px; max-width: 500px; margin: auto;">
        <h2 style="color: #38bdf8; margin-top: 0; letter-spacing: 1px;">LEMURIA LUXURY HOTELS</h2>
        <p style="font-size: 15px; color: #cbd5e1;">Use the verification code below to complete your ${purpose.toLowerCase()} process.</p>
        <div style="background: rgba(56, 189, 248, 0.1); border: 1px solid #38bdf8; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #38bdf8;">${otpCode}</span>
        </div>
        <p style="font-size: 13px; color: #94a3b8;">This code is valid for <strong>5 minutes</strong>. If you did not request this verification, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;" />
        <p style="font-size: 11px; color: #64748b; text-align: center;">&copy; 2026 Lemuria Luxury Hotels &amp; Resorts. All rights reserved.</p>
      </div>
    `
  };

  if (!transporter) {
    console.log(`[EmailService DEV] Simulated OTP delivery to ${toEmail} | Code: [${otpCode}]`);
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] OTP email sent successfully to ${toEmail} | Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EmailService Error] Failed to send email to ${toEmail}: ${error.message}`);
    console.log(`[EmailService Fallback] OTP for ${toEmail} is [${otpCode}]`);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOTPEmail
};
