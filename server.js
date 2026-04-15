// ================= IMPORTS =================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

// ===== MODELS =====
const User = require("./models/User");
const Sensor = require("./models/Sensor");
const Employee = require("./models/Employee");
const Complaint = require("./models/Complaint");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ================= MONGODB =================
mongoose.connect("mongodb://127.0.0.1:27017/smart_washroom")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));


// =====================================================
// 🔐 AUTH API (LOGIN / SIGNUP)
// =====================================================

app.post("/api/signup", async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: "User already exists" });
  }
});

app.post("/api/login", async (req, res) => {
  const user = await User.findOne(req.body);
  if (!user) return res.status(401).json({ error: "Invalid login" });
  res.json(user);
});


// =====================================================
// 📡 ESP8266 SENSOR API
// =====================================================
// ESP URL → /save_data?temp=..&hum=..&gas=..&users=..&score=..


// ================= ESP8266 DATA API =================
// ESP sends GET request with query parameters
app.get("/save_data", async (req, res) => {
  try {
    const temp = parseFloat(req.query.temp);
    const hum = parseFloat(req.query.hum);
    const gas = parseFloat(req.query.gas);
    const users = parseInt(req.query.users);
    const score = parseFloat(req.query.score);

    console.log("📥 Incoming Sensor Data:", req.query);

    const newData = new Sensor({
      temperature: temp,
      humidity: hum,
      gas: gas,
      peopleCount: users,
      cleanlinessScore: score
    });

    await newData.save();

    // 🔴 Send realtime update to admin dashboard
    io.emit("sensorUpdate", newData);

    res.send("Data Saved Successfully ✅");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving data");
  }
});


// =====================================================
// 📊 ADMIN DASHBOARD DATA
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
      performance: e.totalTasks == 0 ? 0 :
        Math.round((e.completedTasks / e.totalTasks) * 100)
    }))
  });
});


// =====================================================
// 👨‍🔧 EMPLOYEE JOB APIs
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
// 🧾 COMPLAINT API (USER)
// =====================================================

app.post("/complaint", async (req, res) => {
  await Complaint.create(req.body);
  res.send("Complaint saved");
});


// =====================================================
// 🚀 START SERVER
// =====================================================
server.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});