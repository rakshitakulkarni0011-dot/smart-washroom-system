const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: String,
    phone: { type: String, required: true, unique: true },
    password: String,
    role: String
});

module.exports = mongoose.model("User", userSchema);