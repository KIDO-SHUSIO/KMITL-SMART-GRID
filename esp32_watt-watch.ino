#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ======================== ตั้งค่า ========================
const char* WIFI_SSID = "RedmiNote-13";
const char* WIFI_PASS = "1234567890";

const char* SUPABASE_URL = "https://ecmdrqotdtbmfckovtbw.supabase.co/rest/v1/rooms?on_conflict=id";
const char* SUPABASE_KEY = "sb_publishable_X8gWTK8ZjbD47K8sgr7dcA_0_tARmsz";
const char* LINE_TOKEN   = "hCMwj5lL9wHdw3qinXm9A4aKZX3Z//xXmtPDvz19IU0ZdIYRlPsgPixiEyjPXrht/hwt1i5A3P9S8+itdWFtVzD8i0OOADyDLQh/x+Mg8V4lyjgqcH9dkHf1Dlzc8nrEaTMpvGrhPygiaH/lD7FMNY9PbdgDzCFqoOLOYbqAITQ=";
const unsigned long LINE_COOLDOWN_MS = 180000; // Cooldown 3 นาที ป้องกันสแปมแจ้งเตือนซ้ำ

const int   VOLTAGE_V        = 220;
const float MAX_AMPS         = 20.0;
const unsigned long MOTION_HOLD_MS = 5000;
const unsigned long PIR_WARMUP_MS  = 0;        // ตอนโชว์จริงค่อยเปลี่ยนเป็น 30000
const unsigned long LONG_PRESS_MS  = 800;
const unsigned long AUTO_SEND_MS   = 800;
const unsigned long MIN_GAP_MS     = 500;
const float         AMPS_DELTA     = 0.3;
// ========================================================

#define PIN_PIR       4
#define PIN_POT       34
#define PIN_SWITCH    32
#define PIN_BTN       0     // BOOT = กดค้างเพื่อส่ง
#define PIN_BTN_SEND  26
#define PIN_BTN_ROOM  27

// ขา LED ของแต่ละห้อง (เรียงตามลำดับห้องด้านล่าง)
const int LED_PINS[] = {2, 15, 16, 17, 18, 19};

struct RoomDef {
  const char* id;
  const char* building;
  const char* room;
  const char* zone;
};

const RoomDef ROOMS[] = {
  {"ecc-402",  "ECC Building", "402",   "Engineering"},      // index 0 → GPIO 2
  {"ecc-403",  "ECC Building", "403",   "Engineering"},      // index 1 → GPIO 15
  {"it-105",   "IT Building",  "105",   "Information Tech"}, // index 2 → GPIO 16
  {"it-204",   "IT Building",  "204",   "Information Tech"}, // index 3 → GPIO 17
  {"ee-lab-1", "EE Building",  "Lab 1", "Electrical"},       // index 4 → GPIO 18
  {"me-301",   "ME Building",  "301",   "Mechanical"},       // index 5 → GPIO 19
};
const int ROOM_COUNT = 6;

bool roomLoadOn[ROOM_COUNT];     // สถานะเปิด-ปิดของแต่ละห้อง
int  roomBrightness[ROOM_COUNT]; // ความสว่างล่าสุดของแต่ละห้อง
unsigned long lastLineAlertMs[ROOM_COUNT] = {0}; // เวลาแจ้งเตือน LINE ล่าสุดของแต่ละห้อง

Adafruit_SSD1306 display(128, 64, &Wire, -1);

int roomIdx = 0;
unsigned long lastMotionMs = 0;
unsigned long bootMs = 0;
unsigned long lastDraw = 0;
unsigned long lastAuto = 0;

float lastSentAmps = -1;
bool  lastSentMotion = false;
int   lastSentRoom = -1;
String lastResult = "ready";

bool lastSwitchState = false;
bool btnDown = false;
unsigned long btnDownAt = 0;
bool longHandled = false;

// -------------------------------------------------------
float readAmps() {
  long sum = 0;
  for (int i = 0; i < 20; i++) {
    sum += analogRead(PIN_POT);
  }
  float raw = sum / 20.0;
  float amps = (raw / 4095.0) * MAX_AMPS;
  if (amps < 0.15) amps = 0;
  return round(amps * 10.0) / 10.0;
}

bool isSwitchOn() {
  return digitalRead(PIN_SWITCH) == LOW;
}

bool isWarmingUp() {
  return (millis() - bootMs) < PIR_WARMUP_MS;
}

bool hasMotion() {
  if (isWarmingUp()) return false;
  return (lastMotionMs > 0) && ((millis() - lastMotionMs) < MOTION_HOLD_MS);
}

// -------------------------------------------------------
void setLedDuty(int index, int duty) {
  duty = constrain(duty, 0, 255);
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(LED_PINS[index], duty);
#else
  ledcWrite(index, duty);
#endif
}

void updateRoomLEDs() {
  float amps = readAmps();
  int liveBrightness = 0;

  if (amps > 0.2) {
    liveBrightness = map(constrain((int)(amps * 10), 2, 200), 2, 200, 20, 255);
  }

  for (int i = 0; i < ROOM_COUNT; i++) {
    int duty = 0;

    if (i == roomIdx) {
      if (roomLoadOn[i]) {
        duty = liveBrightness;
        roomBrightness[i] = duty;
      } else {
        duty = 0;
        roomBrightness[i] = 0;
      }
    } else {
      if (roomLoadOn[i]) {
        duty = roomBrightness[i];
      } else {
        duty = 0;
      }
    }

    setLedDuty(i, duty);
  }
}

// -------------------------------------------------------
bool ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  static unsigned long lastTry = 0;
  if (lastTry != 0 && (millis() - lastTry) < 12000) return false;
  lastTry = millis();

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - t0) < 7000) {
    delay(200);
  }
  return WiFi.status() == WL_CONNECTED;
}

void sendLineAlert(int idx, float amps) {
  if (millis() - lastLineAlertMs[idx] < LINE_COOLDOWN_MS) {
    return; // ยังอยู่ในช่วง Cooldown
  }

  HTTPClient http;
  WiFiClientSecure secure;
  secure.setInsecure();

  http.begin(secure, "https://api.line.me/v2/bot/message/broadcast");
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + LINE_TOKEN);

  char msg[350];
  snprintf(msg, sizeof(msg),
    "🚨 แจ้งเตือน: ตรวจพบ Energy Waste!\n━━━━━━━━━━━━━━━━━━\n🏢 อาคาร: %s\n🚪 ห้อง: Rm %s (%s)\n⚡ กระแส: %.1f A (%.2f kW)\n👤 คนในห้อง: ไม่มีคนอยู่\n━━━━━━━━━━━━━━━━━━\nระบบ: KMITL Smart Grid",
    ROOMS[idx].building,
    ROOMS[idx].room,
    ROOMS[idx].zone,
    amps,
    (amps * VOLTAGE_V) / 1000.0
  );

  char payload[500];
  snprintf(payload, sizeof(payload),
    "{\"messages\":[{\"type\":\"text\",\"text\":\"%s\"}]}",
    msg
  );

  int code = http.POST((uint8_t*)payload, strlen(payload));
  if (code >= 200 && code < 300) {
    lastLineAlertMs[idx] = millis();
    Serial.println("LINE broadcast alert sent successfully!");
  } else {
    Serial.printf("LINE broadcast alert failed: HTTP %d\n", code);
  }
  http.end();
}

void sendTelemetry(float amps, bool motion) {
  if (!ensureWifi()) {
    lastResult = "WiFi FAIL";
    return;
  }

  const char* currentStatus = (!motion && amps >= 7.0) ? "Energy Waste" : "Normal";

  char body[350];
  snprintf(body, sizeof(body),
    "{\"id\":\"%s\",\"building\":\"%s\",\"room_number\":\"%s\",\"zone\":\"%s\",\"current\":%.1f,\"motion\":%s,\"status\":\"%s\"}",
    ROOMS[roomIdx].id,
    ROOMS[roomIdx].building,
    ROOMS[roomIdx].room,
    ROOMS[roomIdx].zone,
    amps,
    motion ? "true" : "false",
    currentStatus
  );

  Serial.println(body);

  HTTPClient http;
  WiFiClientSecure secure;
  secure.setInsecure();

  http.begin(secure, SUPABASE_URL);
  http.setTimeout(5000);
  
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "resolution=merge-duplicates,return=minimal");

  int code = http.POST((uint8_t*)body, strlen(body));

  if (code >= 200 && code < 300) {
    lastResult = "Supabase OK";
  } else {
    lastResult = "HTTP " + String(code);
  }

  http.end();
  Serial.println(lastResult);

  // ถ้าเป็น Energy Waste ให้ส่งแจ้งเตือนเข้า LINE อัตโนมัติ
  if (strcmp(currentStatus, "Energy Waste") == 0) {
    sendLineAlert(roomIdx, amps);
  }
}

void sendNow() {
  float amps = roomLoadOn[roomIdx] ? readAmps() : 0.0;
  bool motion = hasMotion();

  lastSentAmps = amps;
  lastSentMotion = motion;
  lastSentRoom = roomIdx;

  sendTelemetry(amps, motion);
  lastAuto = millis();
}

// -------------------------------------------------------
void draw() {
  float amps = roomLoadOn[roomIdx] ? readAmps() : 0.0;

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(1);
  display.setCursor(0, 0);
  display.printf("%s %s", ROOMS[roomIdx].building, ROOMS[roomIdx].room);

  display.setTextSize(2);
  display.setCursor(0, 14);
  display.printf("%.1f A", amps);

  display.setTextSize(1);
  display.setCursor(0, 36);
  display.printf("Motion:%s Load:%s",
    isWarmingUp() ? "WARM" : (hasMotion() ? "YES" : "NO"),
    roomLoadOn[roomIdx] ? "ON" : "OFF"
  );

  display.setCursor(0, 46);
  display.printf("WiFi:%s", WiFi.status() == WL_CONNECTED ? "OK" : "--");

  display.setCursor(0, 56);
  display.print(lastResult);

  display.display();
}

// -------------------------------------------------------
void handleButtons() {
  unsigned long now = millis();

  bool down = digitalRead(PIN_BTN) == LOW;
  if (down && !btnDown) {
    btnDown = true;
    btnDownAt = now;
    longHandled = false;
  }
  if (down && btnDown && !longHandled && (now - btnDownAt >= LONG_PRESS_MS)) {
    longHandled = true;
    sendNow();
  }
  if (!down && btnDown) {
    btnDown = false;
  }

  static bool roomHeld = false;
  static unsigned long lastRoomPress = 0;
  bool roomBtn = digitalRead(PIN_BTN_ROOM) == LOW;

  if (roomBtn && !roomHeld && (now - lastRoomPress > 300)) {
    roomHeld = true;
    lastRoomPress = now;
    roomIdx = (roomIdx + 1) % ROOM_COUNT;
    lastResult = "room changed";
  }
  if (!roomBtn) roomHeld = false;

  static bool sendHeld = false;
  bool sendBtn = digitalRead(PIN_BTN_SEND) == LOW;
  if (sendBtn && !sendHeld) {
    sendHeld = true;
    sendNow();
  }
  if (!sendBtn) sendHeld = false;
}

// -------------------------------------------------------
void setup() {
  Serial.begin(115200);

  pinMode(PIN_PIR, INPUT);
  pinMode(PIN_SWITCH, INPUT_PULLUP);
  pinMode(PIN_BTN, INPUT_PULLUP);
  pinMode(PIN_BTN_SEND, INPUT_PULLUP);
  pinMode(PIN_BTN_ROOM, INPUT_PULLUP);

  for (int i = 0; i < ROOM_COUNT; i++) {
    pinMode(LED_PINS[i], OUTPUT);

#if ESP_ARDUINO_VERSION_MAJOR >= 3
    ledcAttach(LED_PINS[i], 5000, 8);
#else
    ledcSetup(i, 5000, 8);
    ledcAttachPin(LED_PINS[i], i);
#endif

    roomLoadOn[i] = false;
    roomBrightness[i] = 0;
    setLedDuty(i, 0);
  }

  analogReadResolution(12);
  analogSetPinAttenuation(PIN_POT, ADC_11db);

  Wire.begin(21, 22);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED not found");
  }

  bootMs = millis();
  lastResult = "connecting WiFi";
  draw();
  lastResult = ensureWifi() ? "ready" : "WiFi FAIL";
  updateRoomLEDs();
}

// -------------------------------------------------------
void loop() {
  if (digitalRead(PIN_PIR) == HIGH) {
    lastMotionMs = millis();
  }

  handleButtons();

  bool sw = isSwitchOn();
  if (sw != lastSwitchState) {
    roomLoadOn[roomIdx] = sw;
    if (!sw) {
      roomBrightness[roomIdx] = 0;
    }
    lastSwitchState = sw;
  }

  updateRoomLEDs();

  if (AUTO_SEND_MS > 0) {
    float amps = roomLoadOn[roomIdx] ? readAmps() : 0.0;
    bool motion = hasMotion();

    bool changed =
      (fabs(amps - lastSentAmps) >= AMPS_DELTA) ||
      (motion != lastSentMotion) ||
      (roomIdx != lastSentRoom);

    unsigned long since = millis() - lastAuto;

    if ((changed && since >= MIN_GAP_MS) || (since >= AUTO_SEND_MS)) {
      sendNow();
    }
  }

  if (millis() - lastDraw >= 250) {
    lastDraw = millis();
    draw();
  }

  delay(5);
}