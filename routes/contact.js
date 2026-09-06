// ===========================================================
// Contact Routes
// POST /api/contact       -> submit a new contact message
// GET  /api/contact        -> retrieve all contact messages (admin)
// ===========================================================
const express = require("express");
const router = express.Router();
const ContactMessage = require("../models/ContactMessage");

// @route   POST /api/contact
// @desc    Submit a new contact form message
// @access  Public
router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const newMessage = new ContactMessage({ name, email, subject, message });
    const saved = await newMessage.save();

    return res.status(201).json({
      success: true,
      message: "Your message has been sent successfully.",
      data: saved,
    });
  } catch (error) {
    console.error("Error saving contact message:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

// @route   GET /api/contact
// @desc    Retrieve all contact messages (for admin panel)
// @access  Public in this demo project (add authentication for production use)
router.get("/", async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    console.error("Error fetching contact messages:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

module.exports = router;
