#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <DHT.h>
#include <SoftwareSerial.h>

// ================= WIFI =================
const char* ssid = "vivo T4x 5G";
const char* password = "Rk121212";

// ⚠️ PC IP (NOT localhost)
String server = "http://10.31.52.30:5000/save_data";

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
  Serial.println(WiFi.localIP());
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

  Serial.println("URL: " + url);

  http.begin(client, url);
  int httpCode = http.GET();

  String payload = "";

  if (httpCode > 0)
  {
    payload = http.getString();
    Serial.println("Response: " + payload);
  }
  else
  {
    Serial.println("HTTP Error");
  }

  http.end();

  return payload;
}

// ================= CALL FUNCTION =================
void makeCall(String phone)
{
  Serial.println("Calling: " + phone);

  gsm.println("ATD+91" + phone + ";");
  delay(20000);
  gsm.println("ATH");
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
}

// ================= LOOP =================
void loop()
{
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  int gasValue = analogRead(A0);
  int irValue = digitalRead(IR_PIN);

  Serial.print("Tempearture : ");
  Serial.println(temp);
   Serial.print("Humidity : ");
  Serial.println(hum);
   Serial.print("Gas value : ");
  Serial.println(gasValue);
   Serial.print("User count  : ");
  Serial.println(irValue);


  // USER COUNT
  if (irValue == LOW)
  {
    userCount++;
    Serial.println("User Entered");
    delay(2000);
  }

  // CLEAN SCORE
  cleanScore = 100 - (gasValue / 10) - (userCount * 2);
  if (cleanScore < 0) cleanScore = 0;

  Serial.println("Score: " + String(cleanScore));

  // ALERT CONDITION
  if (cleanScore < 50)
  {
    digitalWrite(RELAY_PIN, HIGH);

    // SEND TO SERVER + GET RESPONSE
    response = sendToServer(temp, hum, gasValue, userCount, cleanScore);

    // CHECK RESPONSE (employee phone)
    if (response.indexOf("phone") != -1)
    {
      int start = response.indexOf("phone") + 8;
      String phone = response.substring(start, start + 10);

      Serial.println("Employee Phone: " + phone);

      makeCall(phone);
    }

    delay(15000);
  }
  else
  {
    digitalWrite(RELAY_PIN, LOW);
  }

  // RESET
  if (cleanScore > 80)
  {
    userCount = 0;
  }

  delay(3000);
}