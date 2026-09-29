const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || 'lemuria_production';

  if (!uri) {
    const err = new Error('MONGODB_URI environment variable is not defined.');
    console.error(`MongoDB: FAILED (Missing MONGODB_URI)`);
    throw err;
  }

  try {
    const conn = await mongoose.connect(uri, {
      dbName: dbName,
      serverSelectionTimeoutMS: 8000,
      autoIndex: true
    });

    isConnected = conn.connection.readyState === 1;
    console.log(`MongoDB: CONNECTED`);
    console.log(`Database: ${conn.connection.name || dbName}`);

    mongoose.connection.on('error', (err) => {
      console.error(`[MongoDB Error] Connection lost or encountered error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn(`[MongoDB Warning] Disconnected from database.`);
    });

    return conn.connection;
  } catch (error) {
    console.error(`MongoDB: FAILED`);
    console.error(`[MongoDB Connection Error] ${error.message}`);
    throw error;
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log(`[MongoDB] Connection gracefully closed.`);
  }
};

const getDBStatus = () => {
  const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
  const stateCode = mongoose.connection.readyState;
  return {
    state: states[stateCode] || 'Unknown',
    connected: stateCode === 1,
    name: mongoose.connection.name || process.env.DB_NAME || 'lemuria_production'
  };
};

module.exports = { connectDB, disconnectDB, getDBStatus };

