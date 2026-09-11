const mongoose = require("mongoose");

const fraudNumberSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true
    },

    status: {
        type: String,
        enum: ["fraud", "safe"],
        required: true
    },

    reason: {
        type: String,
        default: ""
    },

    reportCount: {
        type: Number,
        default: 0
    },
    reporterEmail: {
    type: String,
    default: ""
}


}, {
    timestamps: true
});

module.exports = mongoose.model("FraudNumber", fraudNumberSchema);