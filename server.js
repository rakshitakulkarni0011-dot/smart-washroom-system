// ================= IMPORTS =================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

// MODELS
const User = require("./models/User.js");

const app = express();
const server = http.createServer(app);

// ================= SOCKET =================
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// ================= MIDDLEWARE =================
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ================= DB CONNECT =================
mongoose.connect("mongodb://127.0.0.1:27017/smartwashroom")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log(err));

// ================= MODELS =================

// SENSOR
const Sensor = mongoose.model("Sensor", new mongoose.Schema({
  temperature: Number,
  humidity: Number,
  gas: Number,
  people: Number,
  cleanliness: Number,
  time: { type: Date, default: Date.now }
}));

// EMPLOYEE
const Employee = mongoose.model("Employee", new mongoose.Schema({
  name: String,
  phone: String,
  status: { type: String, default: "Free" }
}));

// JOB
const Job = mongoose.model("Job", new mongoose.Schema({
  employee: String,
  employeePhone: String,
  location: String,
  priority: String,
  status: { type: String, default: "pending" },
  rejectedBy: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
}));

const Feedback = mongoose.model("Feedback", new mongoose.Schema({
  name: String,
  message: String,
  date: { type: Date, default: Date.now }
}));

const Complaint = mongoose.model("Complaint", new mongoose.Schema({
  name: String,
  message: String,
  date: { type: Date, default: Date.now }
}));

// ================= SEED DATA =================
async function seedData() {
  const empCount = await Employee.countDocuments();
  if (empCount === 0) {
    await Employee.insertMany([
      { name: "Rahul Sharma", phone: "9876543210" },
      { name: "Amit Patel", phone: "9123456780" },
      { name: "Sneha Gupta", phone: "9988776655" }
    ]);
    console.log("👷 Employees Seeded");
  }

  const admin = await User.findOne({ role: "Admin" });
  if (!admin) {
    await User.create({
      name: "Super Admin",
      phone: "9999999999",
      password: "admin123",
      role: "Admin"
    });
    console.log("👑 Admin Created");
  }
}
seedData();

// ================= SOCKET =================
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);
  socket.on("disconnect", () => console.log("❌ Disconnected"));
});

// ================= AUTH =================
app.post("/api/signup", async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;
    if (!name || !phone || !password || !role)
      return res.status(400).json({ error: "All fields required" });

    if (await User.findOne({ phone }))
      return res.status(400).json({ error: "Phone already registered" });

    const user = await User.create({ name, phone, password, role });
    res.json({ message: "Signup success", role: user.role });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

app.post("/api/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (!user || user.password !== password)
      return res.status(401).json({ error: "Invalid credentials" });

    res.json(user);
  } catch { res.status(500).json({ error: "Server error" }); }
});

// ================= SENSOR =================
app.post("/api/sensor", async (req, res) => {
  try {
    const data = await Sensor.create(req.body);

    const activeJob = await Job.findOne({
      status: { $in: ["pending", "inprogress"] }
    });
    if (activeJob) return res.json({ success: true });

    if (data.cleanliness < 60 || data.gas > 400) {
      const emp = await Employee.findOne({ status: "Free" });
      if (!emp) return res.json({ success: true });

      const job = await Job.create({
        employee: emp.name,
        employeePhone: emp.phone,
        location: "Washroom A",
        priority: data.gas > 400 ? "HIGH" : "NORMAL"
      });

      emp.status = "Busy";
      await emp.save();

      io.emit("job-update", job);
    }

    res.json({ success: true });
  } catch { res.status(500).json({ error: "Server error" }); }
});

// ================= GET DATA =================
app.get("/api/users", async (req, res) => {
  res.json(await User.find({}, { password: 0 }));
});

app.get("/api/employees", async (req, res) => {
  res.json(await Employee.find());
});

app.get("/api/jobs", async (req, res) => {
  res.json(await Job.find().sort({ createdAt: -1 }));
});

// ================= FEEDBACK =================
app.get("/api/feedback", async (req, res) => {
  const data = await Feedback.find().sort({ date: -1 });
  res.json(data);
});

app.post("/api/feedback", async (req, res) => {
  try {
    await Feedback.create(req.body);
    res.json({ message: "Feedback saved successfully ✅" });
  } catch {
    res.status(500).json({ message: "Error saving feedback" });
  }
});

// ================= COMPLAINT =================
app.post("/api/complaint", async (req, res) => {
  try {
    await Complaint.create(req.body);
    res.json({ message: "Complaint submitted 🚨" });
  } catch {
    res.status(500).json({ message: "Error saving complaint" });
  }
});

// ⭐⭐⭐ STATIC LAST (MOST IMPORTANT FIX)
app.use(express.static(path.join(__dirname, "public")));

// ================= SERVER =================
server.listen(5000, () => {
  console.log("🚀 Server running → http://localhost:5000");
});
