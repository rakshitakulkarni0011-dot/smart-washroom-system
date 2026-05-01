#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>
#include <SoftwareSerial.h>

// ================= WIFI =================
const char *ssid = "vivo T4x 5G";
const char *password = "Rk121212";

// 🌍 CLOUD SERVER
String server = "https://smart-washroom-system.onrender.com/save_data";

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
int lastIRState = HIGH;

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

  Serial.println("\n✅ WiFi Connected");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

// ================= RENDER WAKEUP =================
void wakeServer()
{
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  Serial.println("Waking cloud server...");
  http.begin(client, "https://smart-washroom-system.onrender.com");
  http.GET();
  http.end();
}

// ================= SEND DATA =================
String sendToServer(float temp, float hum, int gas, int users, int score)
{
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String url = server +
               "?temp=" + String(temp) +
               "&hum=" + String(hum) +
               "&gas=" + String(gas) +
               "&users=" + String(users) +
               "&score=" + String(score);

  Serial.println("\n📡 Sending Data...");
  Serial.println(url);

  http.begin(client, url);
  int httpCode = http.GET();

  String payload = "";

  if (httpCode > 0)
  {
    payload = http.getString();
    Serial.println("✅ Response:");
    Serial.println(payload);
  }
  else
  {
    Serial.print("❌ HTTP Error: ");
    Serial.println(httpCode);
  }

  http.end();
  return payload;
}

// ================= GSM CALL =================
void makeCall(String phone)
{
  Serial.println("📞 Calling: " + phone);

  gsm.println("AT");
  delay(1000);

  gsm.println("ATD+91" + phone + ";");
  delay(20000);

  gsm.println("ATH");
}

// ================= EXTRACT PHONE =================
String extractPhone(String response)
{
  int index = response.indexOf("\"phone\":\"");

  if (index != -1)
  {
    index += 9;
    return response.substring(index, index + 10);
  }

  return "";
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
  wakeServer();
  delay(5000);
}

// ================= LOOP =================
void loop()
{
  // 🔁 Reconnect WiFi if disconnected
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("⚠️ WiFi Lost! Reconnecting...");
    connectWiFi();
  }

  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  int gasValue = analogRead(A0);
  int irValue = digitalRead(IR_PIN);

  Serial.println("\n----- SENSOR DATA -----");
  Serial.println("Temp: " + String(temp));
  Serial.println("Hum: " + String(hum));
  Serial.println("Gas: " + String(gasValue));
  Serial.println("IR: " + String(irValue));

  // 🚶 USER COUNT (FIXED)
  if (irValue == LOW && lastIRState == HIGH)
  {
    userCount++;
    Serial.println("🚶 User Entered");
    delay(500);
  }
  lastIRState = irValue;

  // 🧼 CLEAN SCORE (IMPROVED)
  cleanScore = 100 - (gasValue / 15) - (userCount * 3);
  if (cleanScore < 0)
    cleanScore = 0;

  Serial.println("Clean Score: " + String(cleanScore));

  // 🚨 ALERT
  if (cleanScore < 50)
  {
    Serial.println("⚠️ CLEANING REQUIRED");
    digitalWrite(RELAY_PIN, HIGH);

    response = sendToServer(temp, hum, gasValue, userCount, cleanScore);

    // 📲 GET PHONE
    String phone = extractPhone(response);

    if (phone != "")
    {
      Serial.println("📲 Phone: " + phone);
      makeCall(phone);
    }
    else
    {
      Serial.println("❌ No phone received");
    }

    delay(15000);
  }
  else
  {
    digitalWrite(RELAY_PIN, LOW);
  }

  // 🔄 RESET USERS
  if (cleanScore > 80)
  {
    userCount = 0;
  }

  delay(3000);
}