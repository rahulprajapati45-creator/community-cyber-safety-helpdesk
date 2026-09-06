// ===========================================================
// MongoDB connection setup using Mongoose
// ===========================================================
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cyber_safety_helpdesk";

    await mongoose.connect(mongoURI);

    console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    // Exit the process if the database connection fails,
    // since the app cannot function without it.
    process.exit(1);
  }
};

module.exports = connectDB;
