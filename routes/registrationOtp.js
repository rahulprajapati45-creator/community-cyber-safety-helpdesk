const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const PendingRegistration = require("../models/PendingRegistration");

const router = express.Router();


// =========================================================
// Helper: Send Registration OTP Email
// =========================================================

async function sendRegistrationOTPEmail(email, otp) {

    const subject =
        "Community Helpdesk - Email Verification OTP";

    const message =
        `Your Community Helpdesk Email Verification OTP is ${otp}. ` +
        `This OTP is valid for 1 minute and can only be used once.`;

    const sendLibResponse = await fetch(
        "https://sendlib.samueltuoyo.com/api/send",
        {
            method: "POST",

            headers: {
                "Authorization":
                    `Bearer ${process.env.SENDLIB_API_KEY}`,

                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                from: process.env.OTP_EMAIL,
                to: email,
                subject: subject,
                text: message
            })
        }
    );

    const sendLibData =
        await sendLibResponse.json();

    if (!sendLibResponse.ok) {

        console.error(
            "SendLib Registration OTP error:",
            sendLibData
        );

        throw new Error(
            sendLibData.message ||
            "SendLib email failed."
        );
    }
}


// =========================================================
// Send Registration OTP
// =========================================================

router.post(
    "/send-otp",
    async (req, res) => {

        try {

            const email =
                String(req.body.email || "")
                    .toLowerCase()
                    .trim();

            const password =
                String(req.body.password || "");


            if (!email || !password) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Email and password are required."
                });
            }


            if (password.length < 6) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Password must be at least 6 characters."
                });
            }


            // Check if email is already registered
            const existingUser =
                await User.findOne({
                    email: email
                });


            if (existingUser) {

                return res.status(409).json({
                    success: false,
                    message:
                        "Email already registered!"
                });
            }


            // Check existing pending registration
            const existingPending =
                await PendingRegistration.findOne({
                    email: email
                });


            // 30-second resend protection
            if (existingPending) {

                const secondsPassed =
                    (
                        Date.now() -
                        existingPending.lastSentAt.getTime()
                    ) / 1000;


                if (secondsPassed < 30) {

                    const remainingSeconds =
                        Math.ceil(
                            30 - secondsPassed
                        );

                    return res.status(429).json({
                        success: false,
                        message:
                            `Please wait ${remainingSeconds} seconds before requesting another OTP.`
                    });
                }
            }


            // Generate 6-digit OTP
            const otp =
                crypto
                    .randomInt(
                        100000,
                        1000000
                    )
                    .toString();


            // Hash password
            const passwordHash =
                await bcrypt.hash(
                    password,
                    10
                );


            // Hash OTP
            const otpHash =
                await bcrypt.hash(
                    otp,
                    10
                );


            // OTP expires after 1 minute
            const expiresAt =
                new Date(
                    Date.now() + 60 * 1000
                );


            // Save / update pending registration
            await PendingRegistration.findOneAndUpdate(
                {
                    email: email
                },

                {
                    email: email,
                    passwordHash: passwordHash,
                    otpHash: otpHash,
                    expiresAt: expiresAt,
                    attempts: 0,
                    lastSentAt: new Date()
                },

                {
                    upsert: true,
                    new: true
                }
            );


            // Send OTP email
            await sendRegistrationOTPEmail(
                email,
                otp
            );


            return res.json({
                success: true,
                message:
                    "Registration OTP sent successfully."
            });


        } catch (error) {

            console.error(
                "Registration OTP error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to send registration OTP."
            });
        }
    }
);

// =========================================================
// Resend Registration OTP
// =========================================================

router.post(
    "/resend-otp",
    async (req, res) => {

        try {

            const email =
                String(req.body.email || "")
                    .toLowerCase()
                    .trim();


            if (!email) {

                return res.status(400).json({
                    success: false,
                    message: "Email is required."
                });
            }


            // Find pending registration
            const pendingRegistration =
                await PendingRegistration.findOne({
                    email: email
                });


            if (!pendingRegistration) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Registration session not found. Please register again."
                });
            }


            // Check whether email is already registered
            const existingUser =
                await User.findOne({
                    email: email
                });


            if (existingUser) {

                await PendingRegistration.deleteOne({
                    email: email
                });

                return res.status(409).json({
                    success: false,
                    message:
                        "Email already registered!"
                });
            }


            // 30-second resend protection
            const secondsPassed =
                (
                    Date.now() -
                    pendingRegistration.lastSentAt.getTime()
                ) / 1000;


            if (secondsPassed < 30) {

                const remainingSeconds =
                    Math.ceil(
                        30 - secondsPassed
                    );

                return res.status(429).json({
                    success: false,
                    message:
                        `Please wait ${remainingSeconds} seconds before requesting another OTP.`
                });
            }


            // Generate new 6-digit OTP
            const otp =
                crypto
                    .randomInt(
                        100000,
                        1000000
                    )
                    .toString();


            // Hash new OTP
            const otpHash =
                await bcrypt.hash(
                    otp,
                    10
                );


            // New OTP expiry: 1 minute
            const expiresAt =
                new Date(
                    Date.now() + 60 * 1000
                );


            pendingRegistration.otpHash =
                otpHash;

            pendingRegistration.expiresAt =
                expiresAt;

            pendingRegistration.attempts =
                0;

            pendingRegistration.lastSentAt =
                new Date();


            await pendingRegistration.save();


            // Send new OTP
            await sendRegistrationOTPEmail(
                email,
                otp
            );


            return res.json({
                success: true,
                message:
                    "New registration OTP sent successfully."
            });


        } catch (error) {

            console.error(
                "Resend Registration OTP error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to resend registration OTP."
            });
        }
    }
);
// =========================================================
// Verify Registration OTP
// =========================================================

router.post(
    "/verify-otp",
    async (req, res) => {

        try {

            const email =
                String(req.body.email || "")
                    .toLowerCase()
                    .trim();

            const otp =
                String(req.body.otp || "").trim();


            if (!email || !otp) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Email and OTP are required."
                });
            }


            const pendingRegistration =
                await PendingRegistration.findOne({
                    email: email
                });


            if (!pendingRegistration) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Registration OTP not found. Please register again."
                });
            }


            if (
                Date.now() >
                pendingRegistration.expiresAt.getTime()
            ) {

                await PendingRegistration.deleteOne({
                    email: email
                });

                return res.status(400).json({
                    success: false,
                    message:
                        "OTP has expired. Please register again."
                });
            }


            if (
                pendingRegistration.attempts >= 5
            ) {

                return res.status(429).json({
                    success: false,
                    message:
                        "Maximum OTP attempts reached. Please request a new OTP."
                });
            }


            const otpMatch =
                await bcrypt.compare(
                    otp,
                    pendingRegistration.otpHash
                );


            if (!otpMatch) {

                pendingRegistration.attempts += 1;

                await pendingRegistration.save();

                const remainingAttempts =
                    5 -
                    pendingRegistration.attempts;


                return res.status(401).json({
                    success: false,
                    message:
                        `Incorrect OTP. ${remainingAttempts} attempts remaining.`
                });
            }


            // =================================================
            // OTP correct — create actual user
            // =================================================

            const existingUser =
                await User.findOne({
                    email: email
                });


            if (existingUser) {

                await PendingRegistration.deleteOne({
                    email: email
                });

                return res.status(409).json({
                    success: false,
                    message:
                        "Email already registered!"
                });
            }


            const newUser =
                new User({
                    email: email,
                    password:
                        pendingRegistration.passwordHash,
                    role: "user"
                });


            await newUser.save();


            // Remove temporary registration
            await PendingRegistration.deleteOne({
                email: email
            });


            return res.json({
                success: true,
                message:
                    "Email verified successfully. Registration completed!"
            });


        } catch (error) {

            console.error(
                "Verify Registration OTP error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to verify registration OTP."
            });
        }
    }
);


module.exports = router;