#include <DHT.h>
#include <SoftwareSerial.h>

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASS";

String server = "http://YOUR_WEBSITE/save_data.php";

void sendToServer(float temp, float hum, int gas, int users, int score)
{
  WiFiClient client;
  HTTPClient http;

  String url = server + "?temp=" + String(temp) +
               "&hum=" + String(hum) +
               "&gas=" + String(gas) +
               "&users=" + String(users) +
               "&score=" + String(score);

  http.begin(client, url);
  http.GET();
  http.end();
}

#define DHTPIN D4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

#define IR_PIN D5
#define RELAY D6

SoftwareSerial gsm(D2, D1); // RX, TX

int userCount = 0;
int gasThreshold = 350;
int cleanScore = 100;

void setup()
{
  Serial.begin(9600);
  gsm.begin(9600);
  dht.begin();

  pinMode(IR_PIN, INPUT);
  pinMode(RELAY, OUTPUT);
}

void makeCall()
{
  gsm.println("ATD+919404718327;"); // employee number
  delay(20000); // call duration 20 sec
  gsm.println("ATH"); // hang up
}

void loop()
{
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  int gasValue = analogRead(A0);
  int irValue = digitalRead(IR_PIN);

  // User Count
  if(irValue == LOW)
  {
    userCount++;
    delay(2000);
  }

  // Cleanliness Calculation
  cleanScore = 100 - (gasValue / 10) - (userCount * 2);

  Serial.println("Temp:" + String(temp));
  Serial.println("Humidity:" + String(hum));
  Serial.println("Gas:" + String(gasValue));
  Serial.println("Users:" + String(userCount));
  Serial.println("Clean Score:" + String(cleanScore));

  // Dirty condition
  if(cleanScore < 50)
  {
    digitalWrite(RELAY, HIGH); // Alert ON
    sendSMS();                 // SMS alert
    makeCall();                // PHONE CALL alert
    delay(15000);
  }
  else
  {
    digitalWrite(RELAY, LOW);
  }

  // Reset after cleaning
  if(cleanScore > 80)
  {
    userCount = 0;
  }

  sendToServer(temp, hum, gasValue, userCount, cleanScore);
  delay(3000);
}