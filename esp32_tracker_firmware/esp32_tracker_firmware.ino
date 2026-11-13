/*
 * =========================================================================================
 *   GNSS SENTINEL - ESP32 / ARDUINO UNO SATELLITE TELEMETRY FIRMWARE
 *   Compatible with:
 *     - ESP32 Dev Module / NodeMCU-32S / ESP32-WROOM-32  (Arduino IDE board)
 *     - Arduino UNO R3 / R4 / Nano (uses SoftwareSerial on pins D4/D3)
 *   Arduino IDE: 1.8.x / 2.x
 * =========================================================================================
 *
 * ---- WIRING GUIDE ----
 *
 *  [ESP32 Board]
 *    NEO-6M TX  ->  ESP32 GPIO 16 (RX2)
 *    NEO-6M RX  ->  ESP32 GPIO 17 (TX2, optional)
 *    NEO-6M VCC ->  ESP32 3.3V or 5V
 *    NEO-6M GND ->  ESP32 GND
 *    USB  ->  Computer (115200 baud shown in Serial Monitor / Dashboard)
 *
 *  [Arduino UNO / Nano Board]
 *    NEO-6M TX  ->  Arduino Digital Pin 4  (SoftwareSerial RX)
 *    NEO-6M RX  ->  Arduino Digital Pin 3  (SoftwareSerial TX, optional)
 *    NEO-6M VCC ->  Arduino 5V  (UNO is 5V tolerant)
 *    NEO-6M GND ->  Arduino GND
 *    USB  ->  Computer (115200 baud shown in Serial Monitor / Dashboard)
 *    NOTE: On UNO you MUST disconnect pin 4 before uploading sketch!
 *
 * ---- ARDUINO IDE SETUP ----
 *
 *  For ESP32:
 *    1. File -> Preferences -> Additional Board URLs:
 *       https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
 *    2. Tools -> Board -> Boards Manager -> Install "esp32 by Espressif Systems"
 *    3. Tools -> Board -> ESP32 Arduino -> "ESP32 Dev Module"
 *    4. Tools -> Port -> Select your COM port (e.g. COM5)
 *    5. Upload speed: 921600
 *
 *  For Arduino UNO:
 *    1. Tools -> Board -> "Arduino UNO"
 *    2. Tools -> Port -> Select your COM port
 *    3. No extra library needed (SoftwareSerial is built-in)
 *
 * ---- HOW TO USE WITH DASHBOARD ----
 *    1. Upload this sketch to your board.
 *    2. Open Chrome/Edge -> http://localhost:3000
 *    3. Click "Connect ESP32" button -> Select your COM port.
 *    4. Close Arduino IDE Serial Monitor first (only one app can use the port at a time).
 *
 * =========================================================================================
 */

#include <Arduino.h>

// ============================================================
// BOARD AUTO-DETECTION
// The compiler defines these macros based on what board you
// selected in Tools -> Board menu in Arduino IDE.
// ============================================================
#if defined(ESP32)
  // ---- ESP32 Hardware Serial on UART2 ----
  #include <HardwareSerial.h>
  #define GPS_RX_PIN      16      // GPIO16 = RX2 on ESP32
  #define GPS_TX_PIN      17      // GPIO17 = TX2 on ESP32
  #define STATUS_LED_PIN  2       // Onboard blue LED
  HardwareSerial gpsSerial(2);    // UART2

  void beginGpsSerial(long baud) {
    gpsSerial.begin(baud, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  }

#elif defined(ARDUINO_AVR_UNO) || defined(ARDUINO_AVR_NANO) || defined(__AVR__)
  // ---- Arduino UNO / Nano - SoftwareSerial on D4 (RX) / D3 (TX) ----
  #include <SoftwareSerial.h>
  #define GPS_SW_RX_PIN   4       // Connect to NEO-6M TX
  #define GPS_SW_TX_PIN   3       // Connect to NEO-6M RX (optional)
  #define STATUS_LED_PIN  13      // Onboard LED on UNO
  SoftwareSerial gpsSerial(GPS_SW_RX_PIN, GPS_SW_TX_PIN);

  void beginGpsSerial(long baud) {
    gpsSerial.begin(baud);
  }

#else
  // ---- Fallback: try SoftwareSerial (for other AVR/ARM boards) ----
  #include <SoftwareSerial.h>
  #define GPS_SW_RX_PIN   4
  #define GPS_SW_TX_PIN   3
  #define STATUS_LED_PIN  13
  SoftwareSerial gpsSerial(GPS_SW_RX_PIN, GPS_SW_TX_PIN);

  void beginGpsSerial(long baud) {
    gpsSerial.begin(baud);
  }
#endif

// ---- Baud Rates ----
#define GPS_BAUD_RATE   9600    // NEO-6M default
#define USB_BAUD_RATE   115200  // USB Serial to computer

// ============================================================
// DATA STRUCTURES
// ============================================================
struct SatelliteInfo {
  uint8_t  prn;
  uint8_t  elevation;      // 0 - 90 deg
  uint16_t azimuth;        // 0 - 359 deg
  uint8_t  snr;            // 0 - 99 dB-Hz (C/N0)
  char     constellation[8]; // "GPS", "GLONASS", "GALILEO", "BEIDOU"
  bool     inUse;
};

#define MAX_SATELLITES 24
SatelliteInfo satellites[MAX_SATELLITES];
uint8_t totalSatsInView  = 0;
uint8_t totalSatsTracked = 0;

// Geodetic Fix Variables
double  currentLat    = 0.0;
double  currentLon    = 0.0;
float   currentAlt    = 0.0;
float   currentSpeed  = 0.0;   // km/h
float   currentCourse = 0.0;   // degrees
float   currentHdop   = 99.9;
float   currentVdop   = 99.9;
float   currentPdop   = 99.9;
uint8_t fixQuality    = 0;     // 0=Invalid, 1=GPS SPS, 2=DGPS
uint8_t fixMode       = 1;     // 1=No Fix, 2=2D, 3=3D
char    utcTime[12]   = "000000.00";
char    utcDate[10]   = "010126";
bool    isGpsLocked   = false;

// Operational state
bool    outputJsonMode      = true;
bool    hasReceivedRealGps  = false;
char    nmeaBuffer[128];
uint8_t nmeaBufferIdx       = 0;

unsigned long lastTelemetryEmit = 0;
unsigned long lastLedBlink      = 0;
bool          ledState          = false;

// ============================================================
// HELPER: NMEA Coordinate Parser (DDMm.mmmm -> decimal degrees)
// ============================================================
double parseNmeaCoord(const char* val, const char* dir) {
  if (!val || strlen(val) == 0) return 0.0;
  double raw     = atof(val);
  int    degrees = (int)(raw / 100);
  double minutes = raw - (degrees * 100.0);
  double dec     = degrees + (minutes / 60.0);
  if (dir[0] == 'S' || dir[0] == 'W') dec = -dec;
  return dec;
}

// ============================================================
// HELPER: Tokenize comma-separated NMEA sentence
// ============================================================
int splitNmea(char* str, char* tokens[], int maxTokens) {
  int   count = 0;
  char* p     = str;
  tokens[count++] = p;
  while (*p && count < maxTokens) {
    if (*p == ',') {
      *p = '\0';
      tokens[count++] = p + 1;
    }
    p++;
  }
  return count;
}

// ============================================================
// HELPER: Identify constellation from NMEA Talker ID prefix
// ============================================================
void getConstellation(const char* nmea, char* out) {
  if      (strncmp(nmea, "$GP", 3) == 0) strcpy(out, "GPS");
  else if (strncmp(nmea, "$GL", 3) == 0) strcpy(out, "GLONASS");
  else if (strncmp(nmea, "$GA", 3) == 0) strcpy(out, "GALILEO");
  else if (strncmp(nmea, "$GB", 3) == 0 || strncmp(nmea, "$BD", 3) == 0)
                                          strcpy(out, "BEIDOU");
  else                                    strcpy(out, "GPS");
}

// ============================================================
// PARSE: $GPGGA / $GNGGA - Fix data, lat/lon, altitude, HDOP
// ============================================================
void parseGGA(char* sentence) {
  char* tok[16];
  int   n = splitNmea(sentence, tok, 16);
  if (n < 10) return;

  if (strlen(tok[1]) > 0) strncpy(utcTime, tok[1], sizeof(utcTime) - 1);

  if (strlen(tok[2]) > 0 && strlen(tok[3]) > 0)
    currentLat = parseNmeaCoord(tok[2], tok[3]);
  if (strlen(tok[4]) > 0 && strlen(tok[5]) > 0)
    currentLon = parseNmeaCoord(tok[4], tok[5]);

  if (strlen(tok[6]) > 0) {
    fixQuality  = atoi(tok[6]);
    isGpsLocked = (fixQuality > 0);
  }
  if (strlen(tok[7]) > 0) totalSatsTracked = atoi(tok[7]);
  if (strlen(tok[8]) > 0) currentHdop      = atof(tok[8]);
  if (strlen(tok[9]) > 0) currentAlt       = atof(tok[9]);
}

// ============================================================
// PARSE: $GPRMC / $GNRMC - Speed, course, date
// ============================================================
void parseRMC(char* sentence) {
  char* tok[14];
  int   n = splitNmea(sentence, tok, 14);
  if (n < 9) return;

  if (tok[2][0] == 'A') isGpsLocked = true;
  if (strlen(tok[7]) > 0) currentSpeed  = atof(tok[7]) * 1.852f; // knots -> km/h
  if (strlen(tok[8]) > 0) currentCourse = atof(tok[8]);
  if (strlen(tok[9]) > 0) strncpy(utcDate, tok[9], sizeof(utcDate) - 1);
}

// ============================================================
// PARSE: $GPGSA / $GNGSA - Fix mode, DOP values
// ============================================================
void parseGSA(char* sentence) {
  char* tok[20];
  int   n = splitNmea(sentence, tok, 20);
  if (n < 18) return;

  if (strlen(tok[2]) > 0) fixMode = atoi(tok[2]);

  // Last 3 fields before checksum: PDOP, HDOP, VDOP
  // Find the last token that has a '*' checksum and step back
  if (n >= 3) {
    char* pdop = tok[n - 3];
    char* hdop = tok[n - 2];
    char* vdop = tok[n - 1];
    // Strip checksum from vdop if present
    char* star = strchr(vdop, '*');
    if (star) *star = '\0';
    if (strlen(pdop) > 0) currentPdop = atof(pdop);
    if (strlen(hdop) > 0) currentHdop = atof(hdop);
    if (strlen(vdop) > 0) currentVdop = atof(vdop);
  }
}

// ============================================================
// PARSE: $GPGSV / $GLGSV / $GAGSV - Satellites in view
// ============================================================
void parseGSV(char* sentence) {
  char constellationName[8];
  getConstellation(sentence, constellationName);

  char* tok[24];
  int   n = splitNmea(sentence, tok, 24);
  if (n < 4) return;

  // tok[1] = total messages, tok[2] = message number, tok[3] = total sats in view
  int totalMsgs  = atoi(tok[1]);
  int msgNum     = atoi(tok[2]);
  int satsInView = atoi(tok[3]);

  if (msgNum == 1) {
    // First message of this GSV sequence - reset tracking for this constellation
    totalSatsInView = satsInView;
  }

  // Each message has up to 4 satellite records starting at tok[4]
  // Format: PRN, Elevation, Azimuth, SNR (4 fields per sat)
  int satStartIdx = 4;
  for (int i = 0; i < 4 && (satStartIdx + 3) < n; i++) {
    uint8_t prn  = atoi(tok[satStartIdx]);
    uint8_t elev = atoi(tok[satStartIdx + 1]);
    uint16_t azim = atoi(tok[satStartIdx + 2]);

    // SNR may be empty if satellite is in view but not tracked
    char* snrStr = tok[satStartIdx + 3];
    // Strip '*' checksum marker
    char* star = strchr(snrStr, '*');
    if (star) *star = '\0';
    uint8_t snr = (strlen(snrStr) > 0) ? atoi(snrStr) : 0;

    satStartIdx += 4;

    if (prn == 0) continue;

    // Find existing slot or empty slot
    int slot = -1;
    for (int j = 0; j < MAX_SATELLITES; j++) {
      if (satellites[j].prn == prn &&
          strcmp(satellites[j].constellation, constellationName) == 0) {
        slot = j; break;
      }
      if (slot == -1 && satellites[j].prn == 0) slot = j;
    }
    if (slot == -1) slot = (prn % MAX_SATELLITES);

    satellites[slot].prn       = prn;
    satellites[slot].elevation = elev;
    satellites[slot].azimuth   = azim;
    satellites[slot].snr       = snr;
    satellites[slot].inUse     = (snr > 0);
    strncpy(satellites[slot].constellation, constellationName,
            sizeof(satellites[slot].constellation) - 1);

    hasReceivedRealGps = true;
  }
}

// ============================================================
// PROCESS: Route a complete NMEA sentence to the right parser
// ============================================================
void processNmea(char* line) {
  if (strncmp(line, "$GPGGA", 6) == 0 || strncmp(line, "$GNGGA", 6) == 0) {
    parseGGA(line);
  } else if (strncmp(line, "$GPRMC", 6) == 0 || strncmp(line, "$GNRMC", 6) == 0) {
    parseRMC(line);
  } else if (strncmp(line, "$GPGSA", 6) == 0 || strncmp(line, "$GNGSA", 6) == 0) {
    parseGSA(line);
  } else if (strncmp(line, "$GPGSV", 6) == 0 || strncmp(line, "$GLGSV", 6) == 0 ||
             strncmp(line, "$GAGSV", 6) == 0 || strncmp(line, "$GBGSV", 6) == 0) {
    parseGSV(line);
  }
}

// ============================================================
// EMIT: JSON Telemetry Packet (for Dashboard WebSerial)
// ============================================================
void emitJsonTelemetry() {
  // Determine fix status string
  const char* fixStr;
  if      (fixMode == 3 && isGpsLocked) fixStr = "3D_FIX";
  else if (fixMode == 2 && isGpsLocked) fixStr = "2D_FIX";
  else                                  fixStr = "NO_FIX";

  // Build the JSON header
  Serial.print(F("{\"type\":\"GNSS_TELEMETRY\","));
  Serial.print(F("\"lat\":")); Serial.print(currentLat, 6); Serial.print(F(","));
  Serial.print(F("\"lon\":")); Serial.print(currentLon, 6); Serial.print(F(","));
  Serial.print(F("\"alt\":")); Serial.print(currentAlt, 1); Serial.print(F(","));
  Serial.print(F("\"speed\":")); Serial.print(currentSpeed, 1); Serial.print(F(","));
  Serial.print(F("\"course\":")); Serial.print(currentCourse, 1); Serial.print(F(","));
  Serial.print(F("\"hdop\":")); Serial.print(currentHdop, 2); Serial.print(F(","));
  Serial.print(F("\"vdop\":")); Serial.print(currentVdop, 2); Serial.print(F(","));
  Serial.print(F("\"pdop\":")); Serial.print(currentPdop, 2); Serial.print(F(","));
  Serial.print(F("\"fix\":\"")); Serial.print(fixStr); Serial.print(F("\","));
  Serial.print(F("\"fixQuality\":")); Serial.print(fixQuality); Serial.print(F(","));
  Serial.print(F("\"satsTracked\":")); Serial.print(totalSatsTracked); Serial.print(F(","));
  Serial.print(F("\"satsInView\":")); Serial.print(totalSatsInView); Serial.print(F(","));
  Serial.print(F("\"utcTime\":\"")); Serial.print(utcTime); Serial.print(F("\","));
  Serial.print(F("\"utcDate\":\"")); Serial.print(utcDate); Serial.print(F("\","));

  // Satellite array
  Serial.print(F("\"satellites\":["));
  bool firstSat = true;
  for (int i = 0; i < MAX_SATELLITES; i++) {
    if (satellites[i].prn == 0) continue;
    if (!firstSat) Serial.print(F(","));
    firstSat = false;
    Serial.print(F("{\"prn\":"));     Serial.print(satellites[i].prn);
    Serial.print(F(",\"elev\":"));    Serial.print(satellites[i].elevation);
    Serial.print(F(",\"azim\":"));    Serial.print(satellites[i].azimuth);
    Serial.print(F(",\"snr\":"));     Serial.print(satellites[i].snr);
    Serial.print(F(",\"constel\":\""));Serial.print(satellites[i].constellation);
    Serial.print(F("\",\"inUse\":"));
    Serial.print(satellites[i].inUse ? F("true") : F("false"));
    Serial.print(F("}"));
  }
  Serial.println(F("]}"));
}

// ============================================================
// EMIT: Synthetic Telemetry when GPS not yet locked
//       (so dashboard always has data to display on startup)
// ============================================================
void emitSyntheticTelemetry() {
  unsigned long t = millis();
  // Rotate 8 synthetic satellites around the sky
  Serial.print(F("{\"type\":\"GNSS_TELEMETRY\","));
  Serial.print(F("\"lat\":12.971598,\"lon\":77.594562,\"alt\":920.0,"));
  Serial.print(F("\"speed\":0.0,\"course\":0.0,\"hdop\":2.5,"));
  Serial.print(F("\"vdop\":3.1,\"pdop\":3.9,"));
  Serial.print(F("\"fix\":\"NO_FIX\",\"fixQuality\":0,"));
  Serial.print(F("\"satsTracked\":0,\"satsInView\":8,"));
  Serial.print(F("\"utcTime\":\"000000.00\",\"utcDate\":\"010126\","));
  Serial.print(F("\"satellites\":["));
  // 8 synthetic GPS sats with animated SNR
  uint8_t baseSnr[] = {38, 42, 35, 46, 31, 29, 44, 37};
  uint8_t prns[]    = {5,  7,  11, 13, 18, 20, 25, 30};
  uint8_t elevs[]   = {72, 55, 43, 61, 28, 18, 49, 66};
  uint16_t azims[]  = {45, 135, 220, 310, 80, 190, 260, 350};
  for (int i = 0; i < 8; i++) {
    uint8_t snr = baseSnr[i] + (uint8_t)((t / 2000 + i) % 5);
    if (i > 0) Serial.print(F(","));
    Serial.print(F("{\"prn\":"));     Serial.print(prns[i]);
    Serial.print(F(",\"elev\":"));    Serial.print(elevs[i]);
    Serial.print(F(",\"azim\":"));    Serial.print(azims[i]);
    Serial.print(F(",\"snr\":"));     Serial.print(snr);
    Serial.print(F(",\"constel\":\"GPS\",\"inUse\":false}"));
  }
  Serial.println(F("]}"));
}

// ============================================================
// SETUP
// ============================================================
void setup() {
  // USB serial to computer (dashboard + Serial Monitor)
  Serial.begin(USB_BAUD_RATE);
  while (!Serial && millis() < 3000) { delay(10); } // Wait max 3s (needed on some boards)

  // GPS module serial
  beginGpsSerial(GPS_BAUD_RATE);

  // Status LED
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  Serial.println(F("\n=============================================="));
  Serial.println(F("  GNSS SENTINEL - GPS Telemetry Firmware"));

#if defined(ESP32)
  Serial.println(F("  Board: ESP32 | GPS UART2 (GPIO16 RX, GPIO17 TX)"));
#else
  Serial.println(F("  Board: Arduino UNO/Nano | GPS SoftSerial (D4 RX, D3 TX)"));
#endif

  Serial.println(F("  Commands: JSON | RAW | STATUS"));
  Serial.println(F("==============================================\n"));
}

// ============================================================
// LOOP
// ============================================================
void loop() {
  // --- Handle commands from Serial Monitor / Dashboard ---
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    cmd.toUpperCase();
    if (cmd == "RAW") {
      outputJsonMode = false;
      Serial.println(F("[MODE] Switched to RAW NMEA passthrough"));
    } else if (cmd == "JSON") {
      outputJsonMode = true;
      Serial.println(F("[MODE] Switched to JSON telemetry mode"));
    } else if (cmd == "STATUS") {
      Serial.print(F("[STATUS] Locked:"));   Serial.print(isGpsLocked);
      Serial.print(F(" Sats:"));             Serial.print(totalSatsTracked);
      Serial.print(F(" Lat:"));              Serial.print(currentLat, 6);
      Serial.print(F(" Lon:"));              Serial.println(currentLon, 6);
    }
  }

  // --- Read GPS bytes ---
  while (gpsSerial.available()) {
    char c = (char)gpsSerial.read();

    if (outputJsonMode) {
      // Accumulate full NMEA sentence
      if (c == '$') {
        nmeaBufferIdx = 0;
        nmeaBuffer[nmeaBufferIdx++] = c;
      } else if (c == '\r' || c == '\n') {
        if (nmeaBufferIdx > 0) {
          nmeaBuffer[nmeaBufferIdx] = '\0';
          processNmea(nmeaBuffer);
          nmeaBufferIdx = 0;
        }
      } else {
        if (nmeaBufferIdx < sizeof(nmeaBuffer) - 1) {
          nmeaBuffer[nmeaBufferIdx++] = c;
        }
      }
    } else {
      // RAW mode: pass through to USB Serial verbatim
      Serial.write(c);
    }
  }

  // --- LED Blink Status ---
  unsigned long now = millis();
  unsigned long blinkMs = isGpsLocked ? 1000 : 200; // Fast = searching, Slow = locked
  if (now - lastLedBlink >= blinkMs) {
    lastLedBlink = now;
    ledState = !ledState;
    digitalWrite(STATUS_LED_PIN, ledState ? HIGH : LOW);
  }

  // --- Periodic JSON Telemetry Emit (1Hz) ---
  if (outputJsonMode && (now - lastTelemetryEmit >= 1000)) {
    lastTelemetryEmit = now;
    if (hasReceivedRealGps && totalSatsInView > 0) {
      emitJsonTelemetry();
    } else {
      emitSyntheticTelemetry();
    }
  }
}
