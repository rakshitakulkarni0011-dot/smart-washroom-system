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
const io = new Server(server, { cors: { origin: "*" } });

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.static("public"));


// =====================================================
// 🌍 MONGODB ATLAS CONNECTION (RENDER READY)
// =====================================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Atlas Connected ✅"))
  .catch(err => console.log("Mongo Error:", err));


// =====================================================
// 🔐 AUTH API
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
// 📡 ESP8266 SENSOR API
// =====================================================
app.get("/save_data", async (req, res) => {
  try {
    const temp = parseFloat(req.query.temp);
    const hum = parseFloat(req.query.hum);
    const gas = parseFloat(req.query.gas);
    const users = parseInt(req.query.users);
    const score = parseFloat(req.query.score);

    console.log("📥 Sensor Data:", req.query);

    const data = await Sensor.create({
      temperature: temp,
      humidity: hum,
      gas: gas,
      peopleCount: users,
      cleanlinessScore: score
    });

    // 🔴 realtime update admin dashboard
    io.emit("sensorUpdate", data);

    res.send("Saved ✅");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error");
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
// 🧾 COMPLAINT API
// =====================================================
app.post("/complaint", async (req, res) => {
  await Complaint.create(req.body);
  res.send("Complaint saved");
});


// =====================================================
// 🚀 START SERVER (RENDER PORT FIX)
// =====================================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});