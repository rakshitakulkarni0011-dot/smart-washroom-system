const mongoose = require("mongoose");

const sensorSchema = new mongoose.Schema({
  temperature: Number,
  humidity: Number,
  gas: Number,
  peopleCount: Number,
  cleanlinessScore: Number,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Sensor", sensorSchema);