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

        const number = phone.trim();

        // Indian 10-digit mobile number validation
        if (!/^[6-9][0-9]{9}$/.test(number)) {
            return res.json({
                success: false,
                message: "Please enter a valid 10-digit mobile number."
            });
        }

        // ==========================================
        // STEP 1: CHECK MONGODB FIRST
        // ==========================================

        const result = await FraudNumber.findOne({
            phone: number
        });

        // Number found in MongoDB
        if (result) {

            if (result.status === "fraud") {
                return res.json({
                    success: true,
                    status: "fraud",
                    source: "database",
                    message: "⚠️ This number is reported as FRAUD / SPAM."
                });
            }

            if (result.status === "safe") {
                return res.json({
                    success: true,
                    status: "safe",
                    source: "database",
                    message: "✅ This number is marked as SAFE."
                });
            }
        }

        // ==========================================
        // STEP 2: NOT FOUND → CHECK VERIPHONE API
        // ==========================================

        if (!process.env.VERIPHONE_API_KEY) {
            return res.json({
                success: true,
                status: "unknown",
                source: "database",
                message: "ℹ️ Number is not in our database and API verification is not configured."
            });
        }

        try {

            const response = await axios.get(
                "https://api.veriphone.io/v2/verify",
                {
                    params: {
                        phone: number,
                        key: process.env.VERIPHONE_API_KEY
                    },
                    timeout: 10000
                }
            );

            const data = response.data;

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

            return res.json({
                success: true,
                status: "unknown",
                source: "api",
                message: "⚠️ Number could not be verified by the API."
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
                message: "⚠️ Number could not be verified right now. Please try again."
            });
        }

    } catch (error) {

        console.error("Number checker error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while checking the number."
        });
    }
});

module.exports = router;
