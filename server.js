// ================= IMPORTS =================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const User = require("./models/User");
const Sensor = require("./models/Sensor");

const app = express();
const server = http.createServer(app);

// ================= SOCKET =================
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve frontend
app.use(express.static(path.join(__dirname, "public")));

// ================= DB CONNECT =================
mongoose.connect("mongodb://127.0.0.1:27017/smartwashroom")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("DB Error:", err));

// ================= MODELS =================
const Employee = mongoose.model("Employee", new mongoose.Schema({
  name: String,
  phone: String,
  status: { type: String, default: "Free" }
}));

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
  if (await Employee.countDocuments() === 0) {
    await Employee.insertMany([
      { name: "Rahul Sharma", phone: "9876543210" },
      { name: "Amit Patel", phone: "9123456780" },
      { name: "Sneha Gupta", phone: "9988776655" }
    ]);
    console.log("👷 Employees Seeded");
  }

  if (!await User.findOne({ role: "Admin" })) {
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

// ================= SOCKET CONNECTION =================
io.on("connection", async (socket) => {
  console.log("🔌 Client connected:", socket.id);

  // send latest sensor data instantly
  const latest = await Sensor.findOne().sort({ createdAt: -1 });
  if (latest) socket.emit("sensor-update", latest);

  socket.on("disconnect", () => console.log("❌ Disconnected"));
});

// ===================================================
// 🔐 AUTH ROUTES
// ===================================================
app.post("/api/signup", async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;
    if (!name || !phone || !password || !role)
      return res.status(400).json({ error: "All fields required" });

    if (await User.findOne({ phone }))
      return res.status(400).json({ error: "Phone already registered" });

    const user = await User.create({ name, phone, password, role });
    res.json({ message: "Signup success", role: user.role });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (!user || user.password !== password)
      return res.status(401).json({ error: "Invalid credentials" });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ===================================================
// 📡 SENSOR ROUTES (ESP8266)
// ===================================================

// ESP sends data
app.post("/api/sensor", async (req, res) => {
  try {
    const { temperature, humidity, gas, peopleCount, cleanlinessScore } = req.body;

    if ([temperature, humidity, gas, peopleCount, cleanlinessScore].includes(undefined))
      return res.status(400).json({ error: "Missing sensor fields" });

    const saved = await Sensor.create(req.body);

    // 🔴 live push to dashboard
    io.emit("sensor-update", saved);

    res.json({ message: "Sensor saved" });
  } catch (err) {
    console.log("Sensor Error:", err);
    res.status(500).json({ error: "Sensor save failed" });
  }
});

// latest reading
app.get("/api/sensor/latest", async (req, res) => {
  const latest = await Sensor.findOne().sort({ createdAt: -1 });
  res.json(latest);
});

// history for charts
app.get("/api/sensor/history", async (req, res) => {
  const history = await Sensor.find().sort({ createdAt: -1 }).limit(15);
  res.json(history.reverse());
});

// ===================================================
// 📊 DATA ROUTES
// ===================================================
app.get("/api/users", async (req, res) => {
  res.json(await User.find({}, { password: 0 }));
});

app.get("/api/employees", async (req, res) => {
  res.json(await Employee.find());
});

app.get("/api/jobs", async (req, res) => {
  res.json(await Job.find().sort({ createdAt: -1 }));
});

// ===================================================
// 💬 FEEDBACK & COMPLAINT
// ===================================================
app.post("/api/feedback", async (req, res) => {
  await Feedback.create(req.body);
  res.json({ message: "Feedback saved" });
});

app.get("/api/feedback", async (req, res) => {
  res.json(await Feedback.find().sort({ date: -1 }));
});

app.post("/api/complaint", async (req, res) => {
  await Complaint.create(req.body);
  res.json({ message: "Complaint saved" });
});

// ================= GLOBAL ERROR HANDLER =================
app.use((err, req, res, next) => {
  console.error("🔥 Global Error:", err);
  res.status(500).json({ error: "Something broke!" });
});

// ================= START SERVER =================
server.listen(5000, () => {
  console.log("🚀 Server running → http://localhost:5000");
});