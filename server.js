require("dotenv").config();

// ================= IMPORTS =================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

// ===== MODELS =====
const User = require("./models/User");
const Sensor = require("./models/Sensor");
const Employee = require("./models/Employee");
const Complaint = require("./models/Complaint");

const app = express();
const server = http.createServer(app);

// ================= SOCKET =================
const io = new Server(server, {
  cors: { origin: "*" }
});

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

console.log("MONGO_URI =", process.env.MONGO_URI);

// ================= MONGODB =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Atlas Connected ✅"))
  .catch(err => console.log("Mongo Error:", err));

// ================= SOCKET CONNECTION =================
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

// =====================================================
// 🔐 AUTH
// =====================================================
app.post("/api/signup", async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.json(user);
  } catch {
    res.status(400).json({ error: "User already exists" });
  }
});

app.post("/api/login", async (req, res) => {
  const user = await User.findOne(req.body);
  if (!user) return res.status(401).json({ error: "Invalid login" });
  res.json(user);
});

// =====================================================
// 📡 SENSOR DATA (ESP8266)
// =====================================================
app.get("/save_data", async (req, res) => {
  try {
    const data = await Sensor.create({
      temperature: parseFloat(req.query.temp),
      humidity: parseFloat(req.query.hum),
      gas: parseFloat(req.query.gas),
      peopleCount: parseInt(req.query.users),
      cleanlinessScore: parseFloat(req.query.score)
    });

    io.emit("sensorUpdate", data);

    // 🔥 FIND AVAILABLE EMPLOYEE
    const employee = await Employee.findOne({ available: true });

    if (employee) {

      // 🔔 Notify frontend (Employee.html)
      io.emit("call-employee", employee.phone);

      // 📲 SEND PHONE TO ESP8266
      return res.json({
        status: "alert",
        phone: employee.phone
      });
    }

    res.json({ status: "no_employee" });

  } catch (err) {
    console.log(err);
    res.status(500).send("Error saving data");
  }
});
// =====================================================
// 📊 DASHBOARD
// =====================================================
app.get("/dashboard-data", async (req, res) => {
  const latest = await Sensor.find().sort({ date: -1 }).limit(1);
  const sensors = await Sensor.find().sort({ date: -1 }).limit(5);
  const employees = await Employee.find();

  res.json({
    temp: latest[0]?.temperature || 0,
    hum: latest[0]?.humidity || 0,
    users: latest[0]?.peopleCount || 0,
    clean: latest[0]?.cleanlinessScore || 0,
    mq135: latest[0]?.gas || 0,

    tempArray: sensors.map(s => s.temperature).reverse(),
    humArray: sensors.map(s => s.humidity).reverse(),
    userArray: sensors.map(s => s.peopleCount).reverse(),

    employees: employees.map(e => ({
      name: e.name,
      performance: e.totalTasks == 0
        ? 0
        : Math.round((e.completedTasks / e.totalTasks) * 100)
    }))
  });
});

// =====================================================
// 👨‍🔧 JOBS
// =====================================================
app.get("/jobs", async (req, res) => {
  const employees = await Employee.find();

  res.json({
    jobs: employees.map(e => ({
      _id: e._id,
      location: "Washroom Block A",
      employeePhone: e.phone,
      status: "Pending"
    }))
  });
});

app.get("/job-done/:id", async (req, res) => {
  const emp = await Employee.findById(req.params.id);

  if (emp) {
    emp.completedTasks++;
    await emp.save();
  }

  io.emit("job-update", { msg: "Job completed" });
  res.send("done");
});

// =====================================================
// 🧾 COMPLAINT
// =====================================================
app.post("/complaint", async (req, res) => {
  await Complaint.create(req.body);
  res.send("Complaint saved");
});

// =====================================================
// 🚀 SAFE SERVER START (IMPORTANT FIX)
// =====================================================
const PORT = process.env.PORT || 5001; // changed safer port

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

// ================= ERROR HANDLER =================
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log("❌ Port already in use. Try changing PORT.");
  } else {
    console.log(err);
  }
});