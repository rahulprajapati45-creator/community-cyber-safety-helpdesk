// ===========================================================
// Community Helpdesk for Cyber Safety — Backend Server
// Node.js + Express.js + MongoDB (Mongoose)
// ===========================================================

require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const connectDB = require("./config/db");

const helpdeskRoutes = require("./routes/helpdesk");
const contactRoutes = require("./routes/contact");
const User = require("./models/User");
const numberRoutes = require("./routes/numberRoutes");

const app = express();
const PORT = process.env.PORT || 5000;


// ---------------- Connect to MongoDB ----------------
connectDB();


// ---------------- Core Middleware ----------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ---------------- Serve Frontend ----------------
app.use(express.static(path.join(__dirname, "..", "client")));


// ---------------- API Routes ----------------
app.use("/api/helpdesk", helpdeskRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/number", numberRoutes);


// ---------------- Admin Protection ----------------
async function adminOnly(req, res, next) {

    try {

        const email = req.headers["x-admin-email"];

        if (!email) {

            return res.status(401).json({
                success: false,
                message: "Admin login required."
            });
        }

        const user = await User.findOne({ email });

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


// ---------------- Signup Route ----------------
app.post("/api/signup", async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {

            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {

            return res.json({
                success: false,
                message: "Email already registered!"
            });
        }

        const newUser = new User({
            email,
            password
        });

        await newUser.save();

        return res.json({
            success: true,
            message: "Registration successful!"
        });

    } catch (err) {

        console.error("Signup error:", err.message);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});


// ---------------- Login Route ----------------
app.post("/api/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {

            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const user = await User.findOne({
            email,
            password
        });

        if (!user) {

            return res.json({
                success: false,
                message: "Incorrect email or password!"
            });
        }

        return res.json({

            success: true,

            message: "Login successful!",

            user: {
                email: user.email,
                role: user.role
            }

        });

    } catch (err) {

        console.error("Login error:", err.message);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});


// ---------------- Health Check ----------------
app.get("/api/health", (req, res) => {

    res.json({
        success: true,
        message: "Server is running fine 🚀"
    });

});


// ---------------- Fallback ----------------
// Serve index.html for non-API routes
app.get("/", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client/index.html"));
});


// ---------------- Global Error Handler ----------------
app.use((err, req, res, next) => {

    console.error(
        "Unhandled error:",
        err.stack
    );

    res.status(500).json({
        success: false,
        message: "Something went wrong on the server."
    });

});


// ---------------- Start Server ----------------
app.listen(PORT, () => {

    console.log(
        `🛡️ Community Helpdesk for Cyber Safety server running on http://localhost:${PORT}`
    );

});