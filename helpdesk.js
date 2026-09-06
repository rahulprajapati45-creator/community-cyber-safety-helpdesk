// ===========================================================
// Helpdesk Routes
// POST   /api/helpdesk        -> submit a new help request
// GET    /api/helpdesk         -> retrieve all help requests (admin)
// GET    /api/helpdesk/:id     -> retrieve a single help request (admin)
// PATCH  /api/helpdesk/:id     -> update the status of a request (admin)
// ===========================================================
const express = require("express");
const router = express.Router();
const HelpRequest = require("../models/HelpRequest");

// @route   POST /api/helpdesk
// @desc    Submit a new helpdesk request
// @access  Public
router.post("/", async (req, res) => {
  try {
    const { name, email, problemType, description } = req.body;

    // Basic server-side validation (in addition to client-side checks)
    if (!name || !email || !problemType || !description) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const newRequest = new HelpRequest({
      name,
      email,
      problemType,
      description,
    });

    const savedRequest = await newRequest.save();

    return res.status(201).json({
      success: true,
      message: "Your helpdesk request has been submitted successfully.",
      data: savedRequest,
    });
  } catch (error) {
    console.error("Error saving help request:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

// @route   GET /api/helpdesk
// @desc    Retrieve all helpdesk requests (for admin panel)
// @access  Public in this demo project (add authentication for production use)
router.get("/", async (req, res) => {
  try {
    const requests = await HelpRequest.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Error fetching help requests:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

// @route   GET /api/helpdesk/:id
// @desc    Retrieve a single helpdesk request by ID
// @access  Public in this demo project
// ===========================================================
// GET /api/helpdesk/user/:email
// Get helpdesk requests for a specific user's email
// ===========================================================
router.get("/user/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).trim().toLowerCase();

    const requests = await HelpRequest.find({
      email: email
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });

  } catch (error) {
    console.error("Error fetching user requests:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later."
    });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const request = await HelpRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }
    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    console.error("Error fetching help request:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

// @route   PATCH /api/helpdesk/:id
// @desc    Update the status of a helpdesk request (Pending/In Review/Resolved)
// @access  Public in this demo project (add authentication for production use)
router.patch("/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["Pending", "In Review", "Resolved"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value." });
    }

    const updated = await HelpRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating help request:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});
// @route   PATCH /api/helpdesk/:id/reply
// @desc    Send admin reply to a helpdesk request
// @access  Admin
router.patch("/:id/reply", async (req, res) => {
  try {
    const { adminReply } = req.body;

    if (!adminReply || !adminReply.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply cannot be empty.",
      });
    }

    const updated = await HelpRequest.findByIdAndUpdate(
      req.params.id,
      { adminReply: adminReply.trim() },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Request not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Reply sent successfully.",
      data: updated,
    });

  } catch (error) {
    console.error("Error sending admin reply:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

module.exports = router;
