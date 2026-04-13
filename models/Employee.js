const mongoose = require("mongoose");

const EmployeeSchema = new mongoose.Schema({
  name: String,
  phone: String,
  totalTasks: { type: Number, default: 0 },
  completedTasks: { type: Number, default: 0 },
  lastAssigned: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Employee", EmployeeSchema);