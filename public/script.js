// ===== BASE URL =====
const BASE_URL = "http://localhost:5000";

// ===== PAGE LOAD CHECK =====
console.log("User dashboard loaded ✅");

// ===== SIGN OUT =====
function signOut() {
  localStorage.removeItem("user");
  window.location.href = "/index.html";
}

// ===== SHOW FORMS =====
function showFeedback() {
  document.getElementById("feedbackForm").style.display = "block";
  document.getElementById("complaintForm").style.display = "none";
}

function showComplaint() {
  document.getElementById("complaintForm").style.display = "block";
  document.getElementById("feedbackForm").style.display = "none";
}

// ===== CONNECTION TEST =====
async function testServer() {
  try {
    const res = await fetch(`${BASE_URL}/api/feedback`);
    const text = await res.text();
    console.log("Server Connected:", text);
  } catch (err) {
    console.error("❌ Cannot connect to server", err);
    alert("Server not running!");
  }
}
testServer();

// ===== SUBMIT FEEDBACK =====
async function submitFeedback(e) {
  e.preventDefault();

  const name = e.target[0].value.trim();
  const message = e.target[1].value.trim();

  if (!name || !message) {
    alert("Please fill all fields");
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: name,
        message: message
      })
    });

    const data = await res.json();
    console.log("Feedback Response:", data);

    if (res.ok) {
      alert("Feedback saved successfully ✅");
      e.target.reset();
    } else {
      alert(data.message || "Error saving feedback");
    }

  } catch (err) {
    console.error(err);
    alert("Server error. Is backend running?");
  }
}

// ===== SUBMIT COMPLAINT =====
async function submitComplaint(e) {
  e.preventDefault();

  const name = e.target[0].value.trim();
  const message = e.target[1].value.trim();

  if (!name || !message) {
    alert("Please fill all fields");
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/complaint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: name,
        message: message
      })
    });

    const data = await res.json();
    console.log("Complaint Response:", data);

    if (res.ok) {
      alert("Complaint submitted 🚨");
      e.target.reset();
    } else {
      alert(data.message || "Error submitting complaint");
    }

  } catch (err) {
    console.error(err);
    alert("Server error. Is backend running?");
  }
}