// ===========================================================
// Community Helpdesk for Cyber Safety — Backend Server
// Node.js + Express.js + MongoDB (Mongoose)
// ===========================================================

require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");
const cors = require("cors");
const connectDB = require("./config/db");

const helpdeskRoutes = require("./routes/helpdesk");
const contactRoutes = require("./routes/contact");
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const numberRoutes = require("./routes/numberRoutes");
const adminOtpRoutes = require("./routes/adminOtp");

const app = express();
const PORT = process.env.PORT || 5000;


// ---------------- Connect to MongoDB ----------------
connectDB();


// ---------------- Core Middleware ----------------
app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 1000
    }
}));


// ---------------- Serve Frontend ----------------

app.use(
    express.static(
        path.join(__dirname, "client")
    )
);


// ---------------- API Routes ----------------

app.use(
    "/api/helpdesk",
    helpdeskRoutes
);

app.use(
    "/api/contact",
    contactRoutes
);

app.use(
    "/api/number",
    numberRoutes
);

app.use(
    "/api/admin-otp",
    adminOtpRoutes
);


// =========================================================
// Admin Logout
// =========================================================

app.post(
    "/api/admin/logout",
    (req, res) => {

        req.session.destroy((err) => {

            if (err) {

                console.error(
                    "Logout error:",
                    err.message
                );

                return res.status(500).json({
                    success: false,
                    message: "Logout failed."
                });
            }

            res.clearCookie("connect.sid");

            return res.json({
                success: true,
                message:
                    "Admin logged out successfully."
            });
        });
    }
);


// =========================================================
// Admin Session Check
// =========================================================

app.get(
    "/api/admin/check-session",
    async (req, res) => {

        console.log(
            "ADMIN SESSION CHECK:",
            req.session
        );

        try {

            const adminId =
                req.session.adminId;

            if (!adminId) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Admin login required."
                });
            }

            const user =
                await User.findById(adminId);

            if (
                !user ||
                user.role !== "admin"
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Admin access denied."
                });
            }

            return res.json({
                success: true,
                email: user.email,
                role: user.role
            });

        } catch (error) {

            console.error(
                "Admin session check error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message: "Server error."
            });
        }
    }
);


// ---------------- Admin Protection ----------------

async function adminOnly(
    req,
    res,
    next
) {

    try {

        const adminId =
            req.session.adminId;

        if (!adminId) {

            return res.status(401).json({
                success: false,
                message:
                    "Admin login required."
            });
        }

        const user =
            await User.findById(adminId);

        if (
            !user ||
            user.role !== "admin"
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "Admin access denied."
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


// ---------------- Admin: Get All Users ----------------

app.get(
    "/api/admin/users",
    adminOnly,
    async (req, res) => {

        try {

            const users =
                await User.find(
                    {},
                    {
                        email: 1,
                        role: 1,
                        createdAt: 1
                    }
                ).sort({
                    createdAt: -1
                });

            return res.json({
                success: true,
                data: users
            });

        } catch (error) {

            console.error(
                "Get users error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load users."
            });
        }
    }
);


// ---------------- Signup Route ----------------

app.post(
    "/api/signup",
    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;

            if (!email || !password) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Email and password are required."
                });
            }

            const existingUser =
                await User.findOne({
                    email
                });

            if (existingUser) {

                return res.json({
                    success: false,
                    message:
                        "Email already registered!"
                });
            }

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );

            const newUser =
                new User({
                    email,
                    password: hashedPassword
                });

            await newUser.save();

            return res.json({
                success: true,
                message:
                    "Registration successful!"
            });

        } catch (err) {

            console.error(
                "Signup error:",
                err.message
            );

            return res.status(500).json({
                success: false,
                message: "Server error"
            });
        }
    }
);


// ---------------- Login Route ----------------

app.post(
    "/api/login",
    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;

            if (!email || !password) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Email and password are required."
                });
            }

            const user =
                await User.findOne({
                    email
                });

            if (!user) {

                return res.json({
                    success: false,
                    message:
                        "Incorrect email or password!"
                });
            }

            let passwordMatch = false;


            // Check bcrypt password

            if (
                user.password.startsWith("$2")
            ) {

                passwordMatch =
                    await bcrypt.compare(
                        password,
                        user.password
                    );

            } else {

                // Temporary support for old
                // plain-text passwords

                passwordMatch =
                    password === user.password;


                // Convert old password to bcrypt
                // after successful login

                if (passwordMatch) {

                    user.password =
                        await bcrypt.hash(
                            password,
                            10
                        );

                    await user.save();
                }
            }


            if (!passwordMatch) {

                return res.json({
                    success: false,
                    message:
                        "Incorrect email or password!"
                });
            }


            // =================================================
            // Admin must verify OTP before final login
            // =================================================

            if (user.role === "admin") {

                return res.json({

                    success: true,

                    requiresOtp: true,

                    message:
                        "Password verified. OTP verification required.",

                    user: {
                        email: user.email,
                        role: user.role
                    }
                });
            }


            // =================================================
            // Normal User Login
            // =================================================

            req.session.userId = user._id;
            
            return res.json({

                success: true,

                requiresOtp: false,

                message:
                    "Login successful!",

                user: {
                    email: user.email,
                    role: user.role
                }
            });

        } catch (err) {

            console.error(
                "Login error:",
                err.message
            );

            return res.status(500).json({
                success: false,
                message: "Server error"
            });
        }
    }
);


// ---------------- Health Check ----------------

app.get(
    "/api/health",
    (req, res) => {

        res.json({
            success: true,
            message:
                "Server is running fine 🚀"
        });
    }
);


// ---------------- Fallback ----------------

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.resolve(
                __dirname,
                "client",
                "index.html"
            )
        );
    }
);


// ---------------- Global Error Handler ----------------

app.use(
    (err, req, res, next) => {

        console.error(
            "Unhandled error:",
            err.stack
        );

        res.status(500).json({
            success: false,
            message:
                "Something went wrong on the server."
        });
    }
);


// ---------------- Start Server ----------------

app.listen(
    PORT,
    () => {

        console.log(
            `🛡️ Community Helpdesk for Cyber Safety server running on http://localhost:${PORT}`
        );
    }
);