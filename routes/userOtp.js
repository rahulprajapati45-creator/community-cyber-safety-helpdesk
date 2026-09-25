const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const UserOTP = require("../models/UserOTP");

const router = express.Router();


// =========================================================
// Helper: Send OTP Email
// =========================================================

async function sendUserOTPEmail(email, otp, purpose) {

    let subject = "";
    let message = "";

    if (purpose === "login") {

        subject = "Community Helpdesk - Login OTP";

        message =
            `Your Community Helpdesk Login OTP is ${otp}. ` +
            `This OTP is valid for 1 minute and can only be used once.`;

    } else {

        subject = "Community Helpdesk - Password Reset OTP";

        message =
            `Your Community Helpdesk Password Reset OTP is ${otp}. ` +
            `This OTP is valid for 1 minute and can only be used once.`;
    }


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
            "SendLib API error:",
            sendLibData
        );

        throw new Error(
            sendLibData.message ||
            "SendLib email failed."
        );
    }
}


// =========================================================
// Send Login OTP
// =========================================================

router.post(
    "/login/send-otp",
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


            const user =
                await User.findOne({
                    email: email,
                    role: "user"
                });


            if (!user) {

                return res.status(401).json({
                    success: false,
                    message:
                        "User account not found."
                });
            }


            // 30-second resend protection
            const existingOTP =
                await UserOTP.findOne({
                    email: user.email,
                    purpose: "login"
                });


            if (existingOTP) {

                const secondsPassed =
                    (Date.now() -
                        existingOTP.lastSentAt.getTime()) / 1000;


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
                    .randomInt(100000, 1000000)
                    .toString();


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


            await UserOTP.findOneAndUpdate(
                {
                    email: user.email,
                    purpose: "login"
                },

                {
                    email: user.email,
                    otpHash: otpHash,
                    purpose: "login",
                    expiresAt: expiresAt,
                    attempts: 0,
                    used: false,
                    lastSentAt: new Date()
                },

                {
                    upsert: true,
                    new: true
                }
            );


            // Send email
            await sendUserOTPEmail(
                user.email,
                otp,
                "login"
            );


            return res.json({
                success: true,
                message:
                    "Login OTP sent successfully."
            });


        } catch (error) {

            console.error(
                "User Login OTP error:",
                error.message
            );


            return res.status(500).json({
                success: false,
                message:
                    "Unable to send Login OTP."
            });
        }
    }
);


// =========================================================
// Verify Login OTP
// =========================================================

router.post(
    "/login/verify-otp",
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


            const userOTP =
                await UserOTP.findOne({
                    email: email,
                    purpose: "login"
                });


            if (!userOTP) {

                return res.status(400).json({
                    success: false,
                    message:
                        "OTP not found. Please request a new OTP."
                });
            }


            if (userOTP.used) {

                return res.status(400).json({
                    success: false,
                    message:
                        "This OTP has already been used."
                });
            }


            if (
                Date.now() >
                userOTP.expiresAt.getTime()
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "OTP has expired. Please request a new OTP."
                });
            }


            if (userOTP.attempts >= 5) {

                return res.status(429).json({
                    success: false,
                    message:
                        "Maximum OTP attempts reached. Please request a new OTP."
                });
            }


            const otpMatch =
                await bcrypt.compare(
                    otp,
                    userOTP.otpHash
                );


            if (!otpMatch) {

                userOTP.attempts += 1;

                await userOTP.save();

                const remainingAttempts =
                    5 - userOTP.attempts;


                return res.status(401).json({
                    success: false,
                    message:
                        `Incorrect OTP. ${remainingAttempts} attempts remaining.`
                });
            }


            // Mark OTP as used
            userOTP.used = true;

            await userOTP.save();


            // Get user
            const user =
                await User.findOne({
                    email: email,
                    role: "user"
                });


            if (!user) {

                return res.status(401).json({
                    success: false,
                    message:
                        "User account not found."
                });
            }


            // Create normal user session
            req.session.userId =
                user._id.toString();


            return res.json({

                success: true,

                message:
                    "Login OTP verified successfully.",

                user: {
                    email: user.email,
                    role: user.role
                }
            });


        } catch (error) {

            console.error(
                "Verify Login OTP error:",
                error.message
            );


            return res.status(500).json({
                success: false,
                message:
                    "Unable to verify Login OTP."
            });
        }
    }
);


// =========================================================
// Send Forgot Password OTP
// =========================================================

router.post(
    "/forgot-password/send-otp",
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


            const user =
                await User.findOne({
                    email: email,
                    role: "user"
                });


            if (!user) {

                return res.status(400).json({
                    success: false,
                    message:
                        "No registered user found with this email."
                });
            }


            // 30-second resend protection
            const existingOTP =
                await UserOTP.findOne({
                    email: user.email,
                    purpose: "forgot-password"
                });


            if (existingOTP) {

                const secondsPassed =
                    (Date.now() -
                        existingOTP.lastSentAt.getTime()) / 1000;


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
                    .randomInt(100000, 1000000)
                    .toString();


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


            await UserOTP.findOneAndUpdate(
                {
                    email: user.email,
                    purpose: "forgot-password"
                },

                {
                    email: user.email,
                    otpHash: otpHash,
                    purpose: "forgot-password",
                    expiresAt: expiresAt,
                    attempts: 0,
                    used: false,
                    lastSentAt: new Date()
                },

                {
                    upsert: true,
                    new: true
                }
            );


            // Send email
            await sendUserOTPEmail(
                user.email,
                otp,
                "forgot-password"
            );


            return res.json({
                success: true,
                message:
                    "Password reset OTP sent successfully."
            });


        } catch (error) {

            console.error(
                "Forgot Password OTP error:",
                error.message
            );


            return res.status(500).json({
                success: false,
                message:
                    "Unable to send password reset OTP."
            });
        }
    }
);


// =========================================================
// Verify Forgot Password OTP
// =========================================================

router.post(
    "/forgot-password/verify-otp",
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


            const userOTP =
                await UserOTP.findOne({
                    email: email,
                    purpose: "forgot-password"
                });


            if (!userOTP) {

                return res.status(400).json({
                    success: false,
                    message:
                        "OTP not found. Please request a new OTP."
                });
            }


            if (userOTP.used) {

                return res.status(400).json({
                    success: false,
                    message:
                        "This OTP has already been used."
                });
            }


            if (
                Date.now() >
                userOTP.expiresAt.getTime()
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "OTP has expired. Please request a new OTP."
                });
            }


            if (userOTP.attempts >= 5) {

                return res.status(429).json({
                    success: false,
                    message:
                        "Maximum OTP attempts reached. Please request a new OTP."
                });
            }


            const otpMatch =
                await bcrypt.compare(
                    otp,
                    userOTP.otpHash
                );


            if (!otpMatch) {

                userOTP.attempts += 1;

                await userOTP.save();

                const remainingAttempts =
                    5 - userOTP.attempts;


                return res.status(401).json({
                    success: false,
                    message:
                        `Incorrect OTP. ${remainingAttempts} attempts remaining.`
                });
            }


            // Mark OTP as used
            userOTP.used = true;

            await userOTP.save();


            // Allow password reset only for this session
            req.session.passwordResetEmail =
                email;


            return res.json({
                success: true,
                message:
                    "OTP verified successfully. You can now set a new password."
            });


        } catch (error) {

            console.error(
                "Verify Forgot Password OTP error:",
                error.message
            );


            return res.status(500).json({
                success: false,
                message:
                    "Unable to verify password reset OTP."
            });
        }
    }
);


// =========================================================
// Reset Password
// =========================================================

router.post(
    "/forgot-password/reset",
    async (req, res) => {

        try {

            const {
                email,
                newPassword
            } = req.body;


            const normalizedEmail =
                String(email || "")
                    .toLowerCase()
                    .trim();


            if (
                !normalizedEmail ||
                !newPassword
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Email and new password are required."
                });
            }


            // Password reset authorization
            if (
                req.session.passwordResetEmail !==
                normalizedEmail
            ) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Please verify the password reset OTP first."
                });
            }


            if (newPassword.length < 6) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Password must be at least 6 characters."
                });
            }


            const user =
                await User.findOne({
                    email: normalizedEmail,
                    role: "user"
                });


            if (!user) {

                return res.status(404).json({
                    success: false,
                    message:
                        "User account not found."
                });
            }


            const hashedPassword =
                await bcrypt.hash(
                    newPassword,
                    10
                );


            user.password =
                hashedPassword;


            await user.save();


            // Remove reset authorization
            delete req.session.passwordResetEmail;


            return res.json({
                success: true,
                message:
                    "Password reset successfully."
            });


        } catch (error) {

            console.error(
                "Reset Password error:",
                error.message
            );


            return res.status(500).json({
                success: false,
                message:
                    "Unable to reset password."
            });
        }
    }
);


module.exports = router;