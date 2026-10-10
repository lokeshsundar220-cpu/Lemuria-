require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../src/config/db');
const Guest = require('../src/models/Guest');
const User = require('../src/models/User');

(async () => {
  try {
    await connectDB();
    const newPassword = 'lemuria123';
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    console.log('Generated hash for lemuria123:', newHash);

    const guestRes = await Guest.updateMany({}, { passwordHash: newHash });
    console.log('Updated Guests count:', guestRes.modifiedCount || guestRes.matchedCount);

    const guestUsers = await User.find({ role: 'GUEST' });
    for (const u of guestUsers) {
      u.password = newPassword;
      await u.save();
    }
    console.log('Updated GUEST role User records:', guestUsers.length);

    // Verify
    const sampleGuest = await Guest.findOne({});
    if (sampleGuest) {
      const match = await sampleGuest.comparePassword(newPassword);
      console.log(`Verification for ${sampleGuest.email}: ${match ? 'MATCHED (SUCCESS)' : 'FAILED'}`);
    }

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('Error updating passwords:', err);
    process.exit(1);
  }
})();
