const mongoose = require("mongoose");

const pendingRegistrationSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        passwordHash: {
            type: String,
            required: true
        },

        otpHash: {
            type: String,
            required: true
        },

        expiresAt: {
            type: Date,
            required: true
        },

        attempts: {
            type: Number,
            default: 0
        },

        lastSentAt: {
            type: Date,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports =
    mongoose.model(
        "PendingRegistration",
        pendingRegistrationSchema
    );