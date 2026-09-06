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
        // INDIAN 10-DIGIT MOBILE NUMBER VALIDATION
        // ==========================================

        if (!/^[6-9][0-9]{9}$/.test(number)) {
            return res.json({
                success: false,
                status: "invalid",
                message: "Please enter a valid 10-digit Indian mobile number."
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

module.exports = router;
