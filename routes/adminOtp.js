const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const AdminOTP = require("../models/AdminOTP");

const router = express.Router();



// ---------------- Send OTP ----------------
router.post("/send-otp", async (req, res) => {

    try {

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required."
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim(),
            role: "admin"
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Admin account not found."
            });
        }


        // 30-second resend protection
        const existingOTP = await AdminOTP.findOne({
            email: user.email
        });

        if (existingOTP) {

            const secondsPassed =
                (Date.now() - existingOTP.lastSentAt.getTime()) / 1000;

            if (secondsPassed < 30) {

                const remainingSeconds =
                    Math.ceil(30 - secondsPassed);

                return res.status(429).json({
                    success: false,
                    message: `Please wait ${remainingSeconds} seconds before requesting another OTP.`
                });
            }
        }


        // Generate 6-digit OTP
        const otp = crypto
            .randomInt(100000, 1000000)
            .toString();


        // Hash OTP before database storage
        const otpHash = await bcrypt.hash(otp, 10);


        // OTP expires after 1 minute
        const expiresAt = new Date(
            Date.now() + 60 * 1000
        );


        await AdminOTP.findOneAndUpdate(
            { email: user.email },
            {
                email: user.email,
                otpHash,
                expiresAt,
                attempts: 0,
                used: false,
                lastSentAt: new Date()
            },
            {
                upsert: true,
                new: true
            }
        );


// Send OTP email using SendLib HTTPS API
const sendLibResponse = await fetch(
    "https://sendlib.samueltuoyo.com/api/send",
    {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.SENDLIB_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: process.env.OTP_EMAIL,
            to: user.email,
            subject: "Community Helpdesk - Admin OTP",
            text: `Your Admin Login OTP is ${otp}. This OTP is valid for 1 minute and can only be used once.`
        })
    }
);

const sendLibData = await sendLibResponse.json();

if (!sendLibResponse.ok) {
    console.error(
        "SendLib API error:",
        sendLibData
    );

    throw new Error(
        sendLibData.message || "SendLib email failed."
    );
}




        return res.json({
            success: true,
            message: "OTP sent successfully."
        });


    } catch (error) {

        console.error(
            "Send OTP error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to send OTP."
        });
    }
});


// ---------------- Verify OTP ----------------
router.post("/verify-otp", async (req, res) => {

    try {

        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required."
            });
        }


        const adminOTP = await AdminOTP.findOne({
            email: email.toLowerCase().trim()
        });


        if (!adminOTP) {

            return res.status(400).json({
                success: false,
                message: "OTP not found. Please request a new OTP."
            });
        }


        // Check whether OTP was already used
        if (adminOTP.used) {

            return res.status(400).json({
                success: false,
                message: "This OTP has already been used."
            });
        }


        // Check expiry
        if (Date.now() > adminOTP.expiresAt.getTime()) {

            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new OTP."
            });
        }


        // Maximum 5 wrong attempts
        if (adminOTP.attempts >= 5) {

            return res.status(429).json({
                success: false,
                message: "Maximum OTP attempts reached. Please request a new OTP."
            });
        }


        const otpMatch = await bcrypt.compare(
            String(otp),
            adminOTP.otpHash
        );


        if (!otpMatch) {

            adminOTP.attempts += 1;

            await adminOTP.save();

            const remainingAttempts =
                5 - adminOTP.attempts;

            return res.status(401).json({
                success: false,
                message: `Incorrect OTP. ${remainingAttempts} attempts remaining.`
            });
        }


        // Mark OTP as used
adminOTP.used = true;

await adminOTP.save();

// Get admin user
const user = await User.findOne({
    email: adminOTP.email,
    role: "admin"
});

if (!user) {
    return res.status(401).json({
        success: false,
        message: "Admin account not found."
    });
}

// Create secure admin session
req.session.adminId = user._id.toString();
req.session.adminEmail = user.email;
req.session.adminRole = user.role;

return res.json({
    success: true,
    message: "OTP verified successfully."
});


    } catch (error) {

        console.error(
            "Verify OTP error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to verify OTP."
        });
    }
});


module.exports = router;