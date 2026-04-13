async function loadData() {
  const res = await fetch("http://localhost:5000/api/sensor");
  const data = await res.json();

  const temps = data.map(d => d.temperature);
  const hums = data.map(d => d.humidity);
  const labels = data.map(d => new Date(d.date).toLocaleTimeString());

  // 🌡 Temperature Graph
  new Chart(document.getElementById("tempChart"), {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Temperature",
        data: temps
      }]
    }
  });

  // 💧 Humidity Graph
  new Chart(document.getElementById("humidityChart"), {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Humidity",
        data: hums
      }]
    }
  });

  // 🧼 Cleanliness Graph
  const clean = data.map(d => d.cleanliness == "Clean" ? 1 : 0);

  new Chart(document.getElementById("cleanChart"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Cleanliness",
        data: clean
      }]
    }
  });
}

loadData();