// ===========================================================
// HelpRequest Model
// Stores helpdesk submissions from the "Ask for Help" page
// ===========================================================
const mongoose = require("mongoose");

const helpRequestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email address"],
    },
    problemType: {
      type: String,
      required: [true, "Problem type is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["Pending", "In Review", "Resolved"],
      default: "Pending",
    },
    adminReply: {
  type: String,
  default: "",
  trim: true,
  maxlength: 2000,
},
  },
  { timestamps: true } // adds createdAt / updatedAt automatically
);

module.exports = mongoose.model("HelpRequest", helpRequestSchema);
