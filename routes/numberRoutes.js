require("dotenv").config();

const express = require("express");
const axios = require("axios");
const router = express.Router();

const FraudNumber = require("../models/FraudNumber");
const User = require("../models/User");


// ===========================================================
// ADMIN SESSION PROTECTION
// ===========================================================

async function adminOnly(req, res, next) {

    try {

        const adminId = req.session.adminId;

        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Admin login required."
            });
        }

        const user = await User.findById(adminId);

        if (!user || user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access denied."
            });
        }

        req.admin = user;

        next();

    } catch (error) {

        console.error(
            "Admin verification error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Server error."
        });
    }
}


// ===========================================================
// CHECK MOBILE NUMBER
// ===========================================================

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

        if (number.startsWith("140")) {

            return res.json({
                success: true,
                status: "fraud",
                source: "system",
                message:
                    "⚠️ FRAUD NUMBER: This number is identified as FRAUD / SPAM."
            });
        }


        // ==========================================
        // MOBILE NUMBER VALIDATION
        // ==========================================

        if (!/^[0-9]+$/.test(number)) {

            return res.json({
                success: false,
                status: "invalid",
                message:
                    "Please enter a valid 10-digit mobile number."
            });
        }


        // ==========================================
        // MORE THAN 10 DIGITS = FRAUD
        // ==========================================

        if (number.length > 10) {

            return res.json({
                success: true,
                status: "fraud",
                source: "system",
                message:
                    "⚠️ FRAUD NUMBER: This number is identified as FRAUD / SPAM."
            });
        }


        // ==========================================
        // LESS THAN 10 DIGITS = INVALID
        // ==========================================

        if (number.length < 10) {

            return res.json({
                success: false,
                status: "invalid",
                message:
                    "Please enter a valid 10-digit mobile number."
            });
        }


        // ==========================================
        // 10 DIGITS + STARTING 1-5 = FRAUD
        // ==========================================

        if (/^[1-5]/.test(number)) {

            return res.json({
                success: true,
                status: "fraud",
                source: "system",
                message:
                    "⚠️ FRAUD NUMBER: This number is identified as FRAUD / SPAM."
            });
        }


        // ==========================================
        // 10 DIGITS + STARTING 6-9
        // → MongoDB + Veriphone
        // ==========================================

        if (!/^[6-9][0-9]{9}$/.test(number)) {

            return res.json({
                success: false,
                status: "invalid",
                message:
                    "Please enter a valid 10-digit mobile number."
            });
        }


        // ==========================================
        // STEP 1: CHECK MONGODB FIRST
        // ==========================================

        const result = await FraudNumber.findOne({
            phone: number
        });


        // ==========================================
        // FRAUD NUMBER FOUND IN DATABASE
        // ==========================================

        if (result && result.status === "fraud") {

            return res.json({
                success: true,
                status: "fraud",
                source: "database",
                reportCount:
                    Number(result.reportCount || 0),
                message:
                    "⚠️ FRAUD NUMBER: This number is reported as FRAUD / SPAM. Do not transfer money or share OTP."
            });
        }


        // ==========================================
        // SAFE NUMBER FOUND IN DATABASE
        // ==========================================

        if (result && result.status === "safe") {

            return res.json({
                success: true,
                status: "safe",
                source: "database",
                message:
                    "✅ SAFE NUMBER: This number is marked as SAFE in our database."
            });
        }


        // ==========================================
        // STEP 2: NOT FOUND IN MONGODB
        // → CHECK VERIPHONE API
        // ==========================================

        if (!process.env.VERIPHONE_API_KEY) {

            console.error(
                "VERIPHONE_API_KEY is not configured."
            );

            return res.json({
                success: true,
                status: "unknown",
                source: "api",
                message:
                    "ℹ️ Number is not in our database. Veriphone API is not configured."
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

            console.log(
                "Veriphone response status:",
                data.status
            );


            // ==========================================
            // VERIPHONE API ERROR
            // ==========================================

            if (data.status === "error") {

                console.error(
                    "Veriphone API error:",
                    data.message ||
                    data.type ||
                    "Unknown API error"
                );

                return res.json({
                    success: true,
                    status: "unknown",
                    source: "api",
                    message:
                        "⚠️ Veriphone could not verify this number right now."
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
                    message:
                        "✅ Number is valid. No fraud record found in our database.",
                    phoneType:
                        data.phone_type || "Not available",
                    country:
                        data.country || "Not available",
                    carrier:
                        data.carrier || "Not available"
                });
            }


            // ==========================================
            // INVALID NUMBER
            // ==========================================

            return res.json({
                success: true,
                status: "invalid",
                source: "api",
                message:
                    "❌ Veriphone reports that this number is not valid."
            });


        } catch (apiError) {

            console.error(
                "Veriphone API Error:",
                apiError.response?.data ||
                apiError.message
            );

            return res.json({
                success: true,
                status: "unknown",
                source: "api",
                message:
                    "⚠️ Number could not be verified right now. Please try again later."
            });
        }


    } catch (error) {

        console.error(
            "Number checker error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message:
                "Server error while checking the number."
        });
    }
});


// ===========================================================
// REPORT A SUSPICIOUS NUMBER
// PUBLIC
// ===========================================================

router.post("/report-number", async (req, res) => {

    try {

        const {
            phone,
            email,
            reason
        } = req.body;


        if (!phone) {

            return res.json({
                success: false,
                message:
                    "Please enter a mobile number."
            });
        }


        const number =
            String(phone).trim();


        if (
            !/^[0-9]{10}$/.test(number) &&
            !/^140[0-9]{0,11}$/.test(number)
        ) {

            return res.json({
                success: false,
                message:
                    "Please enter a valid mobile number."
            });
        }


        // Find existing number
        let existingNumber =
            await FraudNumber.findOne({
                phone: number
            });


        if (existingNumber) {

            existingNumber.status =
                "fraud";

            existingNumber.reportCount =
                Number(
                    existingNumber.reportCount || 0
                ) + 1;


            if (reason && reason.trim()) {

                existingNumber.reason =
                    reason.trim();
            }


            if (email && email.trim()) {

                existingNumber.reporterEmail =
                    email.trim();
            }


            await existingNumber.save();


        } else {

            existingNumber =
                await FraudNumber.create({

                    phone: number,

                    status: "fraud",

                    reason:
                        reason
                            ? reason.trim()
                            : "",

                    reporterEmail:
                        email
                            ? email.trim()
                            : "",

                    reportCount: 1
                });
        }


        // Read the SAVED record again
        const savedNumber =
            await FraudNumber.findOne({
                phone: number
            });


        return res.json({

            success: true,

            status: "fraud",

            reportCount:
                Number(
                    savedNumber.reportCount || 0
                ),

            message:
                "⚠️ Report recorded. This number is marked as FRAUD / SPAM."
        });


    } catch (error) {

        console.error(
            "Report number error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Server error."
        });
    }
});


// ===========================================================
// UPDATE REPORTED NUMBER STATUS
// ADMIN ONLY
// ===========================================================

router.put(
    "/update-status",
    adminOnly,
    async (req, res) => {

        try {

            const {
                phone,
                status
            } = req.body;


            if (!phone) {

                return res.json({
                    success: false,
                    message:
                        "Mobile number is required."
                });
            }


            if (
                !["fraud", "safe"]
                    .includes(status)
            ) {

                return res.json({
                    success: false,
                    message:
                        "Invalid status."
                });
            }


            const number =
                String(phone).trim();


            const updatedNumber =
                await FraudNumber.findOneAndUpdate(

                    {
                        phone: number
                    },

                    {
                        status: status
                    },

                    {
                        new: true
                    }
                );


            if (!updatedNumber) {

                return res.json({
                    success: false,
                    message:
                        "Number not found."
                });
            }


            return res.json({

                success: true,

                status:
                    updatedNumber.status,

                message:
                    status === "safe"
                        ? "Number marked as VALID."
                        : "Number marked as FRAUD / SPAM."
            });


        } catch (error) {

            console.error(
                "Update number status error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Server error."
            });
        }
    }
);


// ===========================================================
// GET ALL REPORTED NUMBERS
// ADMIN ONLY
// ===========================================================

router.get(
    "/reported-numbers",
    adminOnly,
    async (req, res) => {

        try {

            const reportedNumbers =
                await FraudNumber.find({
                    status: "fraud"
                }).sort({
                    updatedAt: -1
                });


            return res.json({
                success: true,
                data: reportedNumbers
            });


        } catch (error) {

            console.error(
                "Reported numbers error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Server error."
            });
        }
    }
);


// ===========================================================
// GET ALL VALID NUMBERS
// ADMIN ONLY
// ===========================================================

router.get(
    "/valid-numbers",
    adminOnly,
    async (req, res) => {

        try {

            const validNumbers =
                await FraudNumber.find({

                    status: "safe",

                    reportCount: {
                        $gt: 0
                    }

                }).sort({
                    updatedAt: -1
                });


            return res.json({
                success: true,
                data: validNumbers
            });


        } catch (error) {

            console.error(
                "Valid numbers error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Server error."
            });
        }
    }
);


// ===========================================================
// EXPORT ROUTER
// ===========================================================

module.exports = router;