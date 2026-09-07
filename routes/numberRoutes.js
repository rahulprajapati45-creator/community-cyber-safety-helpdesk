require("dotenv").config();

const express = require("express");
const axios = require("axios");
const router = express.Router();

const FraudNumber = require("../models/FraudNumber");

// Check mobile number
router.post("/check-number", async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.json({
                success: false,
                message: "Please enter a mobile number."
            });
        }

        const number = String(phone).trim();

        // ==========================================
// SPECIAL FRAUD RULE: 140...
// ==========================================

// Any number starting with 140 is treated as FRAUD
if (number.startsWith("140")) {
    return res.json({
        success: true,
        status: "fraud",
        source: "system",
        message: "⚠️ FRAUD NUMBER: This number is identified as FRAUD / SPAM."
    });
}

// ==========================================
// MOBILE NUMBER VALIDATION
// ==========================================

// Exactly 10 digits required
if (!/^[0-9]{10}$/.test(number)) {
    return res.json({
        success: false,
        status: "invalid",
        message: "Please enter a valid 10-digit mobile number."
    });
}

        // ==========================================
        // STEP 1: CHECK MONGODB FIRST
        // ==========================================

        const result = await FraudNumber.findOne({
            phone: number
        });

        // FRAUD NUMBER FOUND IN DATABASE
        if (result && result.status === "fraud") {
            return res.json({
                success: true,
                status: "fraud",
                source: "database",
                message: "⚠️ FRAUD NUMBER: This number is reported as FRAUD / SPAM. Do not transfer money or share OTP."
            });
        }

        // SAFE NUMBER FOUND IN DATABASE
        if (result && result.status === "safe") {
            return res.json({
                success: true,
                status: "safe",
                source: "database",
                message: "✅ SAFE NUMBER: This number is marked as SAFE in our database."
            });
        }

        // ==========================================
        // STEP 2: NOT FOUND IN MONGODB
        // → CHECK VERIPHONE API
        // ==========================================

        if (!process.env.VERIPHONE_API_KEY) {
            console.error("VERIPHONE_API_KEY is not configured.");

            return res.json({
                success: true,
                status: "unknown",
                source: "api",
                message: "ℹ️ Number is not in our database. Veriphone API is not configured."
            });
        }

        try {
            const response = await axios.get(
                "https://api.veriphone.io/v3/verify",
                {
                    params: {
                        phone: "+91" + number
                    },
                    headers: {
                        Authorization:
                            `Bearer ${process.env.VERIPHONE_API_KEY}`
                    },
                    timeout: 10000
                }
            );

            const data = response.data;

            console.log("Veriphone response status:", data.status);

            // ==========================================
            // VERIPHONE API ERROR
            // ==========================================

            if (data.status === "error") {
                console.error(
                    "Veriphone API error:",
                    data.message || data.type || "Unknown API error"
                );

                return res.json({
                    success: true,
                    status: "unknown",
                    source: "api",
                    message: "⚠️ Veriphone could not verify this number right now."
                });
            }

            // ==========================================
            // VALID NUMBER
            // ==========================================

            if (data.phone_valid === true) {
                return res.json({
                    success: true,
                    status: "valid",
                    source: "api",
                    message: "✅ Number is valid. No fraud record found in our database.",
                    phoneType: data.phone_type || "Not available",
                    country: data.country || "Not available",
                    carrier: data.carrier || "Not available"
                });
            }

            // ==========================================
            // INVALID NUMBER
            // ==========================================

            return res.json({
                success: true,
                status: "invalid",
                source: "api",
                message: "❌ Veriphone reports that this number is not valid."
            });

        } catch (apiError) {

            console.error(
                "Veriphone API Error:",
                apiError.response?.data || apiError.message
            );

            return res.json({
                success: true,
                status: "unknown",
                source: "api",
                message: "⚠️ Number could not be verified right now. Please try again later."
            });
        }

    } catch (error) {

        console.error(
            "Number checker error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Server error while checking the number."
        });
    }
});

// ==========================================
// REPORT A SUSPICIOUS NUMBER
// ==========================================
router.post("/report-number", async (req, res) => {
    try {
        const { phone, reason } = req.body;

        if (!phone) {
            return res.json({
                success: false,
                message: "Please enter a mobile number."
            });
        }

        const number = String(phone).trim();

        // Allow normal 10-digit numbers
        // Also allow numbers starting with 140, up to 14 digits
        if (!/^[0-9]{10}$/.test(number) && !/^140[0-9]{0,11}$/.test(number)) {
            return res.json({
                success: false,
                message: "Please enter a valid mobile number."
            });
        }

        // Find existing number
        let existingNumber = await FraudNumber.findOne({
            phone: number
        });

        // If number already exists
        if (existingNumber) {
            existingNumber.reportCount =
                (existingNumber.reportCount || 0) + 1;

            existingNumber.status = "fraud";

            if (reason && reason.trim()) {
                existingNumber.reason = reason.trim();
            }

            await existingNumber.save();

            return res.json({
                success: true,
                status: "fraud",
                reportCount: existingNumber.reportCount,
                message:
                    "⚠️ Report recorded. This number is marked as FRAUD / SPAM."
            });
        }

        // Create new reported number
        const newNumber = await FraudNumber.create({
            phone: number,
            status: "fraud",
            reason: reason ? reason.trim() : "",
            reportCount: 1
        });

        return res.json({
            success: true,
            status: "fraud",
            reportCount: newNumber.reportCount,
            message:
                "⚠️ Thank you. This number has been reported as FRAUD / SPAM."
        });

    } catch (error) {
        console.error("Report number error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error."
        });
    }
});
module.exports = router;
