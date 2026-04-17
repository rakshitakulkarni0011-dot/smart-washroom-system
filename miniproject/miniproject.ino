#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <DHT.h>
#include <SoftwareSerial.h>

// ================= WIFI =================
const char *ssid = "vivo T4x 5G";
const char *password = "Rk121212";

// 🌍 CLOUD SERVER (Render)
String server = "http://smart-washroom-system.onrender.com/save_data";

// ================= DHT =================
#define DHTPIN D4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// ================= PINS =================
#define IR_PIN D5
#define RELAY_PIN D6

// ================= GSM =================
SoftwareSerial gsm(D2, D1); // RX, TX

// ================= VARIABLES =================
int userCount = 0;
int cleanScore = 100;
String response = "";

// ================= WIFI CONNECT =================
void connectWiFi()
{
  WiFi.begin(ssid, password);

  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

// ================= RENDER WAKEUP =================
void wakeServer()
{
  WiFiClient client;
  HTTPClient http;

  Serial.println("Waking cloud server...");
  http.begin(client, "http://smart-washroom-system.onrender.com");
  http.GET();
  http.end();
}

// ================= SEND DATA =================
String sendToServer(float temp, float hum, int gas, int users, int score)
{
  WiFiClient client;
  HTTPClient http;

  String url = server +
               "?temp=" + String(temp) +
               "&hum=" + String(hum) +
               "&gas=" + String(gas) +
               "&users=" + String(users) +
               "&score=" + String(score);

  Serial.println("Sending Data To Cloud...");
  Serial.println(url);

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.GET();
  String payload = "";

  if (httpCode > 0)
  {
    payload = http.getString();
    Serial.println("Server Response:");
    Serial.println(payload);
  }
  else
  {
    Serial.print("HTTP Error: ");
    Serial.println(httpCode);
  }

  http.end();
  return payload;
}

// ================= GSM CALL =================
void makeCall(String phone)
{
  Serial.println("Calling: " + phone);

  gsm.println("AT");
  delay(1000);

  gsm.println("ATD+91" + phone + ";"); // call India number
  delay(20000);                        // call duration 20 sec

  gsm.println("ATH"); // hang up
}

// ================= SETUP =================
void setup()
{
  Serial.begin(9600);
  gsm.begin(9600);
  dht.begin();

  pinMode(IR_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  connectWiFi();
  wakeServer(); // wake Render server
  delay(5000);
}

// ================= LOOP =================
void loop()
{
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  int gasValue = analogRead(A0);
  int irValue = digitalRead(IR_PIN);

  Serial.println("----- SENSOR DATA -----");
  Serial.print("Temperature: ");
  Serial.println(temp);
  Serial.print("Humidity: ");
  Serial.println(hum);
  Serial.print("Gas Value: ");
  Serial.println(gasValue);
  Serial.print("IR Value: ");
  Serial.println(irValue);

  // USER COUNT
  if (irValue == LOW)
  {
    userCount++;
    Serial.println("User Entered 🚶");
    delay(2000);
  }

  // CLEANLINESS SCORE
  cleanScore = 100 - (gasValue / 10) - (userCount * 2);
  if (cleanScore < 0)
    cleanScore = 0;

  Serial.print("Clean Score: ");
  Serial.println(cleanScore);

  // 🚨 ALERT CONDITION
  if (cleanScore < 50)
  {
    Serial.println("⚠️ CLEANING REQUIRED");

    digitalWrite(RELAY_PIN, HIGH);

    // Send to cloud
    response = sendToServer(temp, hum, gasValue, userCount, cleanScore);

    // Extract phone from JSON response
    if (response.indexOf("phone") != -1)
    {
      int start = response.indexOf("phone") + 8;
      String phone = response.substring(start, start + 10);

      Serial.print("Employee Phone: ");
      Serial.println(phone);

      makeCall(phone); // 📞 call employee
    }

    delay(15000);
  }
  else
  {
    digitalWrite(RELAY_PIN, LOW);
  }

  // RESET USER COUNT AFTER CLEANING
  if (cleanScore > 80)
  {
    userCount = 0;
  }

  delay(3000);
}