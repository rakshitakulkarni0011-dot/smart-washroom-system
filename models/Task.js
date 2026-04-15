const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  type: {
    type: String,
    default: "Washroom Cleaning"
  },

  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  status: {
    type: String,
    default: "pending"   // pending | completed
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Task", TaskSchema);