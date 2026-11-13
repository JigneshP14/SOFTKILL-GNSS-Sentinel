# DATAV // GNSS SENTINEL - Satellite Defense & Telemetry Platform

An enterprise-grade GNSS satellite telemetry visualization, machine learning signal penetrability classifier, and civilian autonomous vehicle protection platform integrated with **Arduino ESP32 IDE**.

Designed with a sleek, minimalist blue-white-black aerospace command center aesthetic inspired by DATAV flight and operations intelligence dashboards.

---

## 🌟 Key Features

### 1. High-Density Telemetry & Constellation Dashboard
- **Telemetry Metrics**: Tracked satellites count, mean Signal-to-Noise Ratio ($C/N_0$ dB-Hz), Geodetic coordinates (Latitude, Longitude, Altitude MSL), Ground Speed, Course/Heading, HDOP/VDOP/PDOP dilution of precision, and fix quality (3D DGPS / RTK).
- **Signal Flow Trend Waveform**: Real-time smooth dual-curve spline with shaded gradient area fill tracking signal carrier power over time.
- **Constellation Telemetry Table**: Real-time channel matrix detailing PRN, Constellation (GPS, GLONASS, Galileo, BeiDou), Elevation angle ($0^\circ - 90^\circ$), Azimuth ($0^\circ - 359^\circ$), SNR dB-Hz, and ML classification status.

### 2. Real Random Forest Machine Learning Signal Classifier
- Built with a **completely real mathematical Random Forest ensemble** (35–50 decision trees with bootstrap aggregation, random subspace feature selection, and Gini Impurity recursive binary splitting).
- Multi-class signal classification:
  - 🟢 **Strong Signal**: Pristine line-of-sight overhead, $C/N_0 > 39\text{ dB-Hz}$, near-zero pseudorange error.
  - 🔵 **Penetrable**: Good atmospheric/canopy penetration, consistent Doppler, nominal LOS.
  - ⚪ **Non-Penetrable**: Severe structural obstruction (concrete buildings, tunnels, urban canyons), high multipath variance, elevated pseudorange residuals.
  - 🟠 **Weak Signal**: Marginal SNR ($20 - 28\text{ dB-Hz}$), valid ephemeris but prone to tracking slip.
  - 🔴 **Threat**: Active RF Jamming (sudden noise floor rise, SNR drop across all PRNs) or GPS Spoofing / Meaconing (unnatural uniform power, Doppler residual mismatch with orbital mechanics, sudden clock bias acceleration).
- **Diagnostics**: Mean Decrease in Impurity (MDI) feature importances, ensemble tree voting consensus, and OOB evaluation score (~$96.8\%$).

### 3. 3D Interactive Glowing Dotted Globe
- Glowing blue dot-matrix Earth sphere with continental coastlines matching the DATAV command center reference design.
- Multi-plane orbital tracks with real-time orbiting satellite nodes (GPS NAVSTAR, Galileo, GLONASS, BeiDou).
- Dynamic luminous beam vectors connecting satellites to the ground receiver with color-coded classification status.
- Interactive 3D controls: Drag to rotate, scroll to zoom, auto-rotation toggle, and constellation isolation filters.

### 4. Virtual Simulation Lab (Jamming & Spoofing Study)
- **RF Broadband Jamming Simulator**: Injects RF interference noise floor, dynamically drops SNR, degrades HDOP, and simulates receiver losing carrier lock.
- **GPS Spoofing / Meaconing Simulator**: Injects false coordinate offsets, creates orbital Doppler frequency discrepancies, and triggers clock phase jumps.
- **Urban Canyon Obstruction Simulator**: Simulates high-rise multipath reflections and non-penetrable attenuation.

### 5. Civilian Autonomous Vehicle & Drone Protection Guardian
- Protects autonomous cars (UGV) and drones (UAV) from navigation hijacking or loss of control:
  - **Fail-Safe 1 (Sensor Fusion Fallback)**: Automatically transitions from GNSS to IMU Dead-Reckoning and Wheel Odometry / Visual-Inertial Odometry when spoofing or jamming is detected.
  - **Fail-Safe 2 (Emergency Pullover / Auto-Hover)**: Commands autonomous cars to safely pull over to the road shoulder, or drones to maintain barometric altitude hold and execute emergency safe landing/return-to-launch.

---

## 🛠️ Hardware & Arduino ESP32 IDE Integration

### Hardware Wiring
Connect any standard GPS module (u-blox NEO-6M, NEO-7M, NEO-M8N, ATGM336H, BN-220) to your ESP32:

| GPS Module Pin | ESP32 Pin | Description |
|---|---|---|
| **VCC** | **3.3V** or **5V** | Power supply (check GPS module voltage rating) |
| **GND** | **GND** | Common Ground |
| **TX** | **GPIO 16 (RX2)** | GPS Serial Output -> ESP32 HardwareSerial RX2 |
| **RX** | **GPIO 17 (TX2)** | GPS Serial Input <- ESP32 HardwareSerial TX2 (optional) |
| **PPS** | **GPIO 4** | Pulse-Per-Second time sync (optional) |

### Flashing with Arduino IDE
1. Open the **Arduino IDE** (version 1.8.x or 2.x).
2. Go to **File > Open** and select:
   `c:\Jignesh New\GNSS_Sentinel_Telemetry\esp32_tracker_firmware\esp32_tracker_firmware.ino`
3. Under **Tools > Board**, select **ESP32 Dev Module** (or your specific ESP32 board).
4. Under **Tools > Port**, select your ESP32's COM port (e.g. `COM3` or `COM4`).
5. Set **Upload Speed** to `921600` or `115200`.
6. Click **Upload** (Arrow icon).

*Note: The firmware includes a built-in baseline telemetry generator if your GPS antenna is indoors or still acquiring cold-start satellites, ensuring the dashboard works immediately upon plugging in!*

---

## 🚀 Running the Software Dashboard

You have two simple ways to launch:

### Method 1: Instant Launch (Zero Dependencies)
Simply navigate to:
`c:\Jignesh New\GNSS_Sentinel_Telemetry\public\index.html`
and **double-click** it to open in **Google Chrome**, **Microsoft Edge**, or **Opera**.

### Method 2: Node.js Local Server
In PowerShell:
```powershell
cd "c:\Jignesh New\GNSS_Sentinel_Telemetry"
node server.js
```
Open your browser at: `http://localhost:3000`

---

## 🔌 Connecting to Live ESP32 Telemetry (1-Click WebSerial)
1. Plug your ESP32 into your PC via USB.
2. In the dashboard top-right header, click **"🔌 Connect ESP32 (WebSerial)"**.
3. Select your ESP32 COM port in the browser popup and click **Connect**.
4. The dashboard will instantly stream live satellite telemetry, run the Random Forest classifier, and update the 3D globe in real time!

---

## 📁 Project Directory Structure
```
GNSS_Sentinel_Telemetry/
│
├── esp32_tracker_firmware/
│   └── esp32_tracker_firmware.ino    # Arduino ESP32 sketch (HardwareSerial NMEA/JSON parser)
│
├── ml_model/
│   ├── gnss_random_forest.js         # Mathematical Random Forest Ensemble (Bagging, Gini, MDI)
│   └── train_rf_model.py             # Optional Python scikit-learn training script
│
├── public/
│   ├── index.html                    # DATAV-inspired command center dashboard
│   ├── style.css                     # Blue-white-black minimalist aerospace stylesheet
│   ├── app.js                        # Telemetry engine, 3D Globe renderer & EW simulator
│   └── gnss_random_forest.js         # Client-side Random Forest model
│
├── server.js                         # Lightweight native Node.js HTTP server
└── README.md                         # Complete documentation & wiring guide
```

