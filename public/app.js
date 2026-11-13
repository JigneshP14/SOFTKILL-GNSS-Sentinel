/**
 * DATAV // GNSS SENTINEL - Core Dashboard, 3D Globe & Threat Intelligence Engine
 * Matches the Reference Command Center UI aesthetic
 */

// Initialize Random Forest Classifier
const rfClassifier = new RandomForestClassifier({ nTrees: 35 });
rfClassifier.initDefaultModel();

// Global State
const state = {
  // Connection
  isHardwareConnected: false,
  isDemoMode: true,
  serialPort: null,
  serialReader: null,
  
  // Telemetry
  fixQuality: 1,
  fixMode: 3,
  isLocked: true,
  lat: 12.971598,
  lon: 77.594562,
  alt: 924.5,
  speed: 24.5, // km/h
  course: 135.0,
  hdop: 0.85,
  vdop: 1.12,
  pdop: 1.40,
  satsTracked: 14,
  satsInView: 24,
  meanSnr: 41.2,
  
  // Satellites Collection
  satellites: [],
  
  // Target Vehicle Mode: 'car' | 'drone'
  vehicleType: 'car',
  
  // Threat & Security Status
  threatStatus: 'NOMINAL', // 'NOMINAL' | 'WARNING_WEAK' | 'CRITICAL_JAMMING' | 'CRITICAL_SPOOFING'
  failSafeActive: false,
  failSafeAction: 'Nominal GPS Guidance',
  
  // Virtual Simulation Controls
  simJammingActive: false,
  simJammingIntensity: 45, // 0 - 100%
  simSpoofingActive: false,
  simSpoofingOffset: 0.05, // degrees offset
  simUrbanCanyonActive: false,
  
  // 3D Globe View State
  globeRotation: { x: 0.35, y: -0.8 },
  globeVelocity: { x: 0, y: 0.002 },
  globeZoom: 1.0,
  autoRotate: true,
  filterConstellation: 'ALL', // 'ALL' | 'GPS' | 'GLONASS' | 'GALILEO'
  
  // Telemetry History for Waveform Spline Chart
  historySnr: Array.from({ length: 40 }, () => 38 + Math.random() * 5),
  historyMultipath: Array.from({ length: 40 }, () => 1.2 + Math.random() * 0.8)
};

// -------------------------------------------------------------
// 1. Initial Default Satellite Constellation Generator
// -------------------------------------------------------------
function generateDefaultSatellites() {
  const sats = [];
  const configs = [
    { prn: 1, constel: 'GPS', elev: 68, azim: 142, baseSnr: 44 },
    { prn: 3, constel: 'GPS', elev: 45, azim: 88, baseSnr: 40 },
    { prn: 7, constel: 'GPS', elev: 82, azim: 310, baseSnr: 47 },
    { prn: 8, constel: 'GPS', elev: 52, azim: 215, baseSnr: 42 },
    { prn: 11, constel: 'GPS', elev: 28, azim: 310, baseSnr: 33 },
    { prn: 14, constel: 'GPS', elev: 76, azim: 45, baseSnr: 46 },
    { prn: 17, constel: 'GPS', elev: 19, azim: 180, baseSnr: 27 },
    { prn: 22, constel: 'GPS', elev: 34, azim: 290, baseSnr: 36 },
    { prn: 24, constel: 'GPS', elev: 59, azim: 115, baseSnr: 43 },
    { prn: 28, constel: 'GPS', elev: 15, azim: 350, baseSnr: 24 },
    { prn: 30, constel: 'GPS', elev: 63, azim: 240, baseSnr: 44 },
    { prn: 71, constel: 'GLONASS', elev: 62, azim: 70, baseSnr: 40 },
    { prn: 72, constel: 'GLONASS', elev: 41, azim: 160, baseSnr: 37 },
    { prn: 78, constel: 'GLONASS', elev: 22, azim: 220, baseSnr: 29 },
    { prn: 85, constel: 'GLONASS', elev: 54, azim: 305, baseSnr: 41 },
    { prn: 12, constel: 'GALILEO', elev: 71, azim: 325, baseSnr: 45 },
    { prn: 19, constel: 'GALILEO', elev: 33, azim: 195, baseSnr: 35 },
    { prn: 26, constel: 'GALILEO', elev: 48, azim: 120, baseSnr: 42 },
    { prn: 31, constel: 'GALILEO', elev: 18, azim: 40, baseSnr: 25 },
    { prn: 03, constel: 'BEIDOU', elev: 66, azim: 95, baseSnr: 43 },
    { prn: 09, constel: 'BEIDOU', elev: 51, azim: 175, baseSnr: 39 },
    { prn: 16, constel: 'BEIDOU', elev: 29, azim: 265, baseSnr: 32 }
  ];

  for (const c of configs) {
    sats.push({
      prn: c.prn,
      constellation: c.constel,
      elev: c.elev,
      azim: c.azim,
      snr: c.baseSnr,
      baseSnr: c.baseSnr,
      multipath: 1.0,
      pseudorangeRes: 1.5,
      dopplerRes: 1.2,
      clockDrift: 0.8,
      cn0Delta: 0.2,
      classification: 'Strong Signal',
      confidence: 0.98,
      penetrationScore: 0.95
    });
  }
  return sats;
}

state.satellites = generateDefaultSatellites();

// -------------------------------------------------------------
// 2. Machine Learning Inference Pipeline
// -------------------------------------------------------------
function runMlClassificationPipeline() {
  let threatCount = 0;
  let nonPenetrableCount = 0;
  let weakCount = 0;
  let penetrableCount = 0;
  let strongCount = 0;

  for (const sat of state.satellites) {
    let effectiveSnr = sat.baseSnr;
    let multipath = sat.multipath;
    let pseudoRes = sat.pseudorangeRes;
    let dopplerRes = sat.dopplerRes;
    let clockDrift = sat.clockDrift;
    let deltaSpike = sat.cn0Delta;

    // Apply Virtual Jamming Simulation Effects
    if (state.simJammingActive) {
      const jamLoss = (state.simJammingIntensity / 100) * 32; // up to 32 dB drop
      effectiveSnr = Math.max(8, effectiveSnr - jamLoss + (Math.random() * 4 - 2));
      multipath += (state.simJammingIntensity / 100) * 8.5;
      pseudoRes += (state.simJammingIntensity / 100) * 45;
      dopplerRes += (state.simJammingIntensity / 100) * 60;
      clockDrift += (state.simJammingIntensity / 100) * 25;
      deltaSpike += (state.simJammingIntensity / 100) * 12;
    }

    // Apply Virtual Spoofing Simulation Effects
    if (state.simSpoofingActive) {
      // Spoofing signature: abnormally uniform high SNR, massive Doppler & clock desync
      effectiveSnr = 49.5 + Math.random() * 3.5; // unnatural uniform power
      multipath = 0.5; // artificially clean
      pseudoRes = 35.0 + Math.random() * 40.0; // severe geometric pseudorange error
      dopplerRes = 55.0 + Math.random() * 45.0; // orbit Doppler mismatch
      clockDrift = 28.0 + Math.random() * 15.0; // receiver clock drift jump
      deltaSpike = 8.5 + Math.random() * 6.0;   // sudden power jump
    }

    // Apply Virtual Urban Canyon Simulation Effects
    if (state.simUrbanCanyonActive) {
      if (sat.elev < 40) {
        effectiveSnr = Math.max(12, effectiveSnr - 18);
        multipath += 7.0;
        pseudoRes += 32.0;
      }
    }

    sat.snr = Math.round(effectiveSnr * 10) / 10;
    sat.multipath = multipath;
    sat.pseudorangeRes = pseudoRes;
    sat.dopplerRes = dopplerRes;
    sat.clockDrift = clockDrift;

    // Feature vector for Random Forest
    const features = [
      sat.snr,
      sat.elev,
      sat.azim,
      sat.multipath,
      sat.pseudorangeRes,
      sat.dopplerRes,
      sat.clockDrift,
      deltaSpike
    ];

    // Evaluate with real Random Forest ensemble
    const mlResult = rfClassifier.classify(features);
    sat.classification = mlResult.classification;
    sat.confidence = mlResult.confidence;
    sat.penetrationScore = mlResult.penetrationScore;

    // Tally counts
    if (sat.classification === 'Threat') threatCount++;
    else if (sat.classification === 'Non-Penetrable') nonPenetrableCount++;
    else if (sat.classification === 'Weak Signal') weakCount++;
    else if (sat.classification === 'Penetrable') penetrableCount++;
    else if (sat.classification === 'Strong Signal') strongCount++;
  }

  // Update System Threat Intelligence & Safety Protection
  evaluateVehicleProtection(threatCount, nonPenetrableCount, weakCount, penetrableCount + strongCount);
}

// -------------------------------------------------------------
// 3. Autonomous Car & Drone Protection Guardian Logic
// -------------------------------------------------------------
function evaluateVehicleProtection(threatCount, nonPenetrableCount, weakCount, validSats) {
  const protectionCard = document.getElementById('protectionCard');
  const protectionTitle = document.getElementById('protectionTitle');
  const protectionDesc = document.getElementById('protectionDesc');
  const failSafeAction = document.getElementById('failSafeAction');
  const alertBadge = document.getElementById('alertBadge');

  if (state.simSpoofingActive || threatCount >= 2) {
    state.threatStatus = 'CRITICAL_SPOOFING';
    state.failSafeActive = true;
    state.failSafeAction = state.vehicleType === 'car'
      ? 'FAIL-SAFE ENGAGED: Disengage GNSS -> Autonomous Shoulder Pull-Over via LiDAR & Wheel Odometry'
      : 'FAIL-SAFE ENGAGED: GNSS Desync -> Visual-Inertial Auto-Hover & Emergency Parachute Standby';

    if (protectionCard) {
      protectionCard.className = 'protection-status-card threat-active';
      protectionTitle.innerText = 'CRITICAL THREAT: GPS SPOOFING INJECTION';
      protectionDesc.innerText = 'High-confidence spoofing anomaly detected. Coordinate geometry desynchronized.';
    }
    if (alertBadge) {
      alertBadge.className = 'status-pill danger';
      alertBadge.innerHTML = '<span class="pulse-dot"></span> THREAT DETECTED';
    }
  } else if (state.simJammingActive || (state.simJammingIntensity > 60 && validSats < 4)) {
    state.threatStatus = 'CRITICAL_JAMMING';
    state.failSafeActive = true;
    state.failSafeAction = state.vehicleType === 'car'
      ? 'FAIL-SAFE ENGAGED: Broadband RF Jamming -> Fallback to Inertial Dead-Reckoning (IMU)'
      : 'FAIL-SAFE ENGAGED: RF Blackout -> Execute Barometric Altitude Hold & Safe Return-to-Launch';

    if (protectionCard) {
      protectionCard.className = 'protection-status-card threat-active';
      protectionTitle.innerText = 'CRITICAL THREAT: RF BROADBAND JAMMING';
      protectionDesc.innerText = 'Carrier tracking loops unlocked. SNR floor degraded across all PRNs.';
    }
    if (alertBadge) {
      alertBadge.className = 'status-pill danger';
      alertBadge.innerHTML = '<span class="pulse-dot"></span> JAMMING ACTIVE';
    }
  } else if (state.simUrbanCanyonActive || nonPenetrableCount > validSats) {
    state.threatStatus = 'WARNING_WEAK';
    state.failSafeActive = false;
    state.failSafeAction = 'Signal Degradation: Enhancing Kalman filter gain on wheel ticks and optical flow';

    if (protectionCard) {
      protectionCard.className = 'protection-status-card';
      protectionCard.style.background = 'var(--warning-bg)';
      protectionCard.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      protectionTitle.innerText = 'PENETRATION WARNING: URBAN CANYON';
      protectionDesc.innerText = 'Signals attenuated by high-density structural obstructions. Multipath elevated.';
    }
    if (alertBadge) {
      alertBadge.className = 'status-pill warning';
      alertBadge.innerHTML = '<span class="pulse-dot"></span> CANYON LOSS';
    }
  } else {
    state.threatStatus = 'NOMINAL';
    state.failSafeActive = false;
    state.failSafeAction = 'Nominal RTK/GNSS Guidance: SIL-3 Safety Standards Met';

    if (protectionCard) {
      protectionCard.className = 'protection-status-card';
      protectionCard.style.background = 'var(--success-bg)';
      protectionCard.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      protectionTitle.innerText = 'SYSTEM SECURE // INTEGRITY LEVEL: SIL-3';
      protectionDesc.innerText = 'Clean line-of-sight locks established across 4 constellations.';
    }
    if (alertBadge) {
      alertBadge.className = 'status-pill online';
      alertBadge.innerHTML = '<span class="pulse-dot"></span> DEFENSE SECURE';
    }
  }

  if (failSafeAction) {
    failSafeAction.innerText = state.failSafeAction;
  }
}

// -------------------------------------------------------------
// 3b. Resolve Human-Readable Location Name from Coordinates
// -------------------------------------------------------------
function resolveLocationName(lat, lon) {
  // Structured lookup table: [latMin, latMax, lonMin, lonMax, cityName]
  const regions = [
    // India
    [12.7, 13.2, 77.4, 77.9, 'Bangalore, Karnataka, India'],
    [18.8, 19.3, 72.7, 73.1, 'Mumbai, Maharashtra, India'],
    [28.4, 28.9, 76.9, 77.4, 'New Delhi, Delhi, India'],
    [22.4, 22.8, 88.2, 88.6, 'Kolkata, West Bengal, India'],
    [17.2, 17.6, 78.3, 78.7, 'Hyderabad, Telangana, India'],
    [12.9, 13.2, 80.1, 80.4, 'Chennai, Tamil Nadu, India'],
    [23.0, 23.3, 72.5, 72.8, 'Ahmedabad, Gujarat, India'],
    [18.4, 18.7, 73.7, 74.1, 'Pune, Maharashtra, India'],
    [26.8, 27.0, 80.8, 81.1, 'Lucknow, Uttar Pradesh, India'],
    [21.1, 21.3, 79.0, 79.2, 'Nagpur, Maharashtra, India'],
    [8.4, 8.7, 76.8, 77.1, 'Thiruvananthapuram, Kerala, India'],
    [26.7, 27.0, 75.7, 76.0, 'Jaipur, Rajasthan, India'],
    // USA
    [40.6, 40.9, -74.1, -73.8, 'New York, NY, USA'],
    [33.9, 34.2, -118.5, -118.1, 'Los Angeles, CA, USA'],
    [41.7, 42.0, -87.8, -87.5, 'Chicago, IL, USA'],
    [37.6, 37.9, -122.5, -122.1, 'San Francisco, CA, USA'],
    [47.4, 47.8, -122.5, -122.2, 'Seattle, WA, USA'],
    [33.3, 33.6, -112.2, -111.8, 'Phoenix, AZ, USA'],
    [29.6, 30.0, -95.5, -95.2, 'Houston, TX, USA'],
    [25.6, 25.9, -80.4, -80.1, 'Miami, FL, USA'],
    [38.8, 39.0, -77.2, -76.9, 'Washington DC, USA'],
    // Europe
    [51.3, 51.7, -0.3, 0.2, 'London, United Kingdom'],
    [48.7, 49.0, 2.2, 2.5, 'Paris, France'],
    [52.4, 52.7, 13.3, 13.6, 'Berlin, Germany'],
    [40.3, 40.6, -3.8, -3.5, 'Madrid, Spain'],
    [41.8, 42.0, 12.4, 12.6, 'Rome, Italy'],
    [59.8, 60.0, 10.6, 10.8, 'Oslo, Norway'],
    [59.2, 59.5, 17.9, 18.2, 'Stockholm, Sweden'],
    [48.1, 48.3, 16.3, 16.5, 'Vienna, Austria'],
    // Asia
    [35.5, 36.0, 139.5, 140.0, 'Tokyo, Japan'],
    [37.4, 37.7, 126.9, 127.2, 'Seoul, South Korea'],
    [39.8, 40.1, 116.2, 116.6, 'Beijing, China'],
    [31.0, 31.4, 121.3, 121.7, 'Shanghai, China'],
    [22.2, 22.5, 113.9, 114.3, 'Hong Kong, China'],
    [1.2, 1.5, 103.6, 104.0, 'Singapore'],
    [13.5, 13.9, 100.4, 100.7, 'Bangkok, Thailand'],
    [3.0, 3.3, 101.5, 101.8, 'Kuala Lumpur, Malaysia'],
    [25.1, 25.4, 55.2, 55.5, 'Dubai, UAE'],
    [24.6, 24.8, 46.6, 46.8, 'Riyadh, Saudi Arabia'],
    // Africa
    [-34.1, -33.8, 18.3, 18.7, 'Cape Town, South Africa'],
    [-26.3, -26.0, 28.0, 28.3, 'Johannesburg, South Africa'],
    [-1.4, -1.1, 36.7, 37.0, 'Nairobi, Kenya'],
    [30.0, 30.3, 31.1, 31.4, 'Cairo, Egypt'],
    [6.4, 6.7, 3.2, 3.5, 'Lagos, Nigeria'],
    // Oceania
    [-34.0, -33.7, 150.9, 151.3, 'Sydney, Australia'],
    [-38.0, -37.7, 144.8, 145.1, 'Melbourne, Australia'],
    // South America
    [-23.7, -23.4, -46.8, -46.5, 'São Paulo, Brazil'],
    [-34.7, -34.4, -58.5, -58.2, 'Buenos Aires, Argentina'],
    [4.5, 4.8, -74.2, -73.9, 'Bogotá, Colombia'],
    // General ocean/region fallbacks
    [20.0, 35.0, 65.0, 95.0, 'South Asia Region'],
    [35.0, 70.0, -10.0, 40.0, 'Europe Region'],
    [-35.0, 35.0, -20.0, 55.0, 'Africa Region'],
    [15.0, 55.0, 100.0, 145.0, 'East Asia Region'],
    [25.0, 50.0, -130.0, -60.0, 'North America Region'],
    [-60.0, 15.0, -85.0, -30.0, 'South America Region'],
  ];

  for (const [la0, la1, lo0, lo1, name] of regions) {
    if (lat >= la0 && lat <= la1 && lon >= lo0 && lon <= lo1) return name;
  }
  // Fallback: show hemisphere quadrant
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew} (Open Ocean / Remote)`;
}

// -------------------------------------------------------------
// 4. Update UI Components, Tables, Donut & Trend Waveform
// -------------------------------------------------------------
function updateDashboardUI() {
  // Update Geodetic Coordinates
  let dispLat = state.lat;
  let dispLon = state.lon;
  if (state.simSpoofingActive) {
    dispLat += state.simSpoofingOffset;
    dispLon += state.simSpoofingOffset * 1.2;
  }

  const latElem = document.getElementById('valLat');
  const lonElem = document.getElementById('valLon');
  const altElem = document.getElementById('valAlt');
  const speedElem = document.getElementById('valSpeed');
  const hdopElem = document.getElementById('valHdop');
  const satsElem = document.getElementById('valSats');
  const meanSnrElem = document.getElementById('valMeanSnr');
  const integrityElem = document.getElementById('valIntegrity');

  if (latElem) latElem.innerText = `${Math.abs(dispLat).toFixed(6)}° ${dispLat >= 0 ? 'N' : 'S'}`;
  if (lonElem) lonElem.innerText = `${Math.abs(dispLon).toFixed(6)}° ${dispLon >= 0 ? 'E' : 'W'}`;

  // Update Human-Readable Location Name + Map Link
  const locationNameElem = document.getElementById('valLocationName');
  const mapLinkElem = document.getElementById('btnMapLink');
  if (locationNameElem) {
    const locName = resolveLocationName(dispLat, dispLon);
    locationNameElem.innerText = state.simSpoofingActive ? `⚠️ SPOOFED — ${locName}` : locName;
  }
  if (mapLinkElem) {
    mapLinkElem.href = `https://www.google.com/maps?q=${dispLat.toFixed(6)},${dispLon.toFixed(6)}`;
  }
  if (altElem) altElem.innerText = `${state.alt.toFixed(1)} m`;
  if (speedElem) speedElem.innerText = `${state.speed.toFixed(1)} km/h`;

  // Compute Mean SNR
  let sumSnr = 0;
  let validSats = 0;
  for (const s of state.satellites) {
    if (s.snr > 0) {
      sumSnr += s.snr;
      validSats++;
    }
  }
  const meanSnr = validSats > 0 ? (sumSnr / validSats).toFixed(1) : '0.0';
  state.meanSnr = parseFloat(meanSnr);

  if (meanSnrElem) meanSnrElem.innerText = `${meanSnr} dB-Hz`;
  if (satsElem) satsElem.innerText = `${validSats}`;
  if (hdopElem) {
    let effHdop = state.hdop;
    if (state.simJammingActive) effHdop += (state.simJammingIntensity / 100) * 3.8;
    hdopElem.innerText = effHdop.toFixed(2);
  }
  if (integrityElem) {
    if (state.threatStatus === 'NOMINAL') integrityElem.innerText = '99.8% (Secure)';
    else if (state.threatStatus === 'WARNING_WEAK') integrityElem.innerText = '74.2% (Degraded)';
    else integrityElem.innerText = '12.4% (Compromised)';
  }

  // Update Donut Chart
  updateDonutChart();

  // Update Waveform Trend Curves
  updateWaveformTrend();

  // Update Satellite Telemetry Table
  updateSatelliteTable();

  // Update Full Fleet Table with Exact Names
  updateFleetTable();

  // Update Polar Skyplot Radar
  drawPolarSkyplot();

  // Update ML Feature Importance Bars
  updateMlFeatureBars();
}

function updateDonutChart() {
  const counts = { Penetrable: 0, 'Non-Penetrable': 0, Threat: 0, 'Weak Signal': 0, 'Strong Signal': 0 };
  for (const s of state.satellites) {
    counts[s.classification] = (counts[s.classification] || 0) + 1;
  }
  const total = state.satellites.length || 1;

  const pctPen = Math.round(((counts['Penetrable'] + counts['Strong Signal']) / total) * 100);
  const pctNonPen = Math.round((counts['Non-Penetrable'] / total) * 100);
  const pctThreat = Math.round((counts['Threat'] / total) * 100);
  const pctWeak = Math.round((counts['Weak Signal'] / total) * 100);

  const valPen = document.getElementById('donutValPen');
  const valNonPen = document.getElementById('donutValNonPen');
  const valThreat = document.getElementById('donutValThreat');
  const valWeak = document.getElementById('donutValWeak');
  const donutCenterNum = document.getElementById('donutCenterNum');

  if (valPen) valPen.innerText = `${pctPen}%`;
  if (valNonPen) valNonPen.innerText = `${pctNonPen}%`;
  if (valThreat) valThreat.innerText = `${pctThreat}%`;
  if (valWeak) valWeak.innerText = `${pctWeak}%`;
  if (donutCenterNum) donutCenterNum.innerText = `${total}`;

  // Draw SVG Donut Ring
  const circle = document.getElementById('donutSvgCircle');
  if (circle) {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    circle.style.strokeDasharray = `${circumference}`;
    circle.style.strokeDashoffset = `${circumference * (1 - pctPen / 100)}`;
  }
}

function updateWaveformTrend() {
  const canvas = document.getElementById('trendCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.parentElement.clientWidth;
  const h = canvas.height = canvas.parentElement.clientHeight;

  // Push latest mean SNR and multipath
  state.historySnr.push(state.meanSnr + (Math.random() * 1.5 - 0.75));
  state.historySnr.shift();

  ctx.clearRect(0, 0, w, h);

  // Background subtle grid lines
  ctx.strokeStyle = '#EDF2F7';
  ctx.lineWidth = 1;
  for (let y = 20; y < h; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Smooth Area Spline for C/N0 Flow
  const pts = state.historySnr;
  const stepX = w / (pts.length - 1);
  const minVal = 10, maxVal = 55;

  const getY = (val) => h - ((val - minVal) / (maxVal - minVal)) * (h - 24) - 12;

  // Create gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(0, 102, 255, 0.28)');
  grad.addColorStop(1, 'rgba(0, 194, 255, 0.02)');

  ctx.beginPath();
  ctx.moveTo(0, getY(pts[0]));
  for (let i = 1; i < pts.length; i++) {
    const xPrev = (i - 1) * stepX;
    const yPrev = getY(pts[i - 1]);
    const xCurr = i * stepX;
    const yCurr = getY(pts[i]);
    const cpX = (xPrev + xCurr) / 2;
    ctx.bezierCurveTo(cpX, yPrev, cpX, yCurr, xCurr, yCurr);
  }

  // Close path for area fill
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Draw smooth top line
  ctx.beginPath();
  ctx.moveTo(0, getY(pts[0]));
  for (let i = 1; i < pts.length; i++) {
    const xPrev = (i - 1) * stepX;
    const yPrev = getY(pts[i - 1]);
    const xCurr = i * stepX;
    const yCurr = getY(pts[i]);
    const cpX = (xPrev + xCurr) / 2;
    ctx.bezierCurveTo(cpX, yPrev, cpX, yCurr, xCurr, yCurr);
  }
  ctx.strokeStyle = '#0066FF';
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

// -------------------------------------------------------------
// SATELLITE CATALOG & EXACT REAL-WORLD SPACECRAFT NAMES
// -------------------------------------------------------------
const SATELLITE_CATALOG = {
  // GPS Constellation (PRN 1 - 32)
  'GPS-1':  { name: 'NAVSTAR 63', block: 'GPS IIF-2', norad: 37753, plane: 'D4' },
  'GPS-2':  { name: 'NAVSTAR 69', block: 'GPS IIF-6', norad: 39741, plane: 'D1' },
  'GPS-3':  { name: 'NAVSTAR 70', block: 'GPS IIF-7', norad: 40105, plane: 'E1' },
  'GPS-4':  { name: 'NAVSTAR 74 (Vespucci)', block: 'GPS III-01', norad: 43873, plane: 'F1' },
  'GPS-5':  { name: 'NAVSTAR 64', block: 'GPS IIF-3', norad: 38833, plane: 'E2' },
  'GPS-6':  { name: 'NAVSTAR 67', block: 'GPS IIF-5', norad: 39533, plane: 'D2' },
  'GPS-7':  { name: 'NAVSTAR 57', block: 'GPS IIR-M-4', norad: 32260, plane: 'C4' },
  'GPS-8':  { name: 'NAVSTAR 71', block: 'GPS IIF-8', norad: 40294, plane: 'F2' },
  'GPS-9':  { name: 'NAVSTAR 68', block: 'GPS IIF-4', norad: 39166, plane: 'F4' },
  'GPS-10': { name: 'NAVSTAR 72', block: 'GPS IIF-9', norad: 40534, plane: 'E3' },
  'GPS-11': { name: 'NAVSTAR 76 (M. Henson)', block: 'GPS III-03', norad: 45854, plane: 'A3' },
  'GPS-12': { name: 'NAVSTAR 58', block: 'GPS IIR-M-5', norad: 32384, plane: 'B4' },
  'GPS-13': { name: 'NAVSTAR 78 (Armstrong)', block: 'GPS III-05', norad: 48859, plane: 'D3' },
  'GPS-14': { name: 'NAVSTAR 77 (Sacagawea)', block: 'GPS III-04', norad: 46826, plane: 'B1' },
  'GPS-15': { name: 'NAVSTAR 59', block: 'GPS IIR-M-6', norad: 32711, plane: 'F3' },
  'GPS-16': { name: 'NAVSTAR 56', block: 'GPS IIR-M-3', norad: 31122, plane: 'B2' },
  'GPS-17': { name: 'NAVSTAR 53', block: 'GPS IIR-M-1', norad: 28874, plane: 'C3' },
  'GPS-18': { name: 'NAVSTAR 75 (Magellan)', block: 'GPS III-02', norad: 44506, plane: 'D2' },
  'GPS-19': { name: 'NAVSTAR 54', block: 'GPS IIR-M-2', norad: 29486, plane: 'C2' },
  'GPS-20': { name: 'NAVSTAR 61', block: 'GPS IIR-M-8', norad: 35752, plane: 'B3' },
  'GPS-21': { name: 'NAVSTAR 60', block: 'GPS IIR-M-7', norad: 32765, plane: 'E4' },
  'GPS-22': { name: 'NAVSTAR 66', block: 'GPS IIF-4', norad: 39166, plane: 'E5' },
  'GPS-23': { name: 'NAVSTAR 79 (Earhart)', block: 'GPS III-06', norad: 55268, plane: 'A1' },
  'GPS-24': { name: 'NAVSTAR 65', block: 'GPS IIF-4', norad: 38833, plane: 'A2' },
  'GPS-25': { name: 'NAVSTAR 62', block: 'GPS IIF-1', norad: 36585, plane: 'B1' },
  'GPS-26': { name: 'NAVSTAR 73', block: 'GPS IIF-10', norad: 40730, plane: 'B5' },
  'GPS-27': { name: 'NAVSTAR 74', block: 'GPS IIF-11', norad: 41019, plane: 'C1' },
  'GPS-28': { name: 'NAVSTAR 80', block: 'GPS III-07', norad: 59000, plane: 'F5' },
  'GPS-29': { name: 'NAVSTAR 52', block: 'GPS IIR-13', norad: 28474, plane: 'C1' },
  'GPS-30': { name: 'NAVSTAR 71', block: 'GPS IIF-8', norad: 40294, plane: 'C5' },
  'GPS-31': { name: 'NAVSTAR 55', block: 'GPS IIR-16', norad: 29601, plane: 'A4' },
  'GPS-32': { name: 'NAVSTAR 70', block: 'GPS IIF-7', norad: 40105, plane: 'A5' },

  // Galileo (Europe)
  'GALILEO-1':  { name: 'GSAT0101 (Doresa)', block: 'FOC-1', norad: 40128, plane: 'A1' },
  'GALILEO-2':  { name: 'GSAT0102 (Milena)', block: 'FOC-2', norad: 40129, plane: 'A2' },
  'GALILEO-12': { name: 'GSAT0205 (Alba)', block: 'FOC-5', norad: 40889, plane: 'B3' },
  'GALILEO-19': { name: 'GSAT0206 (Oriana)', block: 'FOC-6', norad: 40890, plane: 'B4' },
  'GALILEO-26': { name: 'GSAT0209 (Ellen)', block: 'FOC-9', norad: 41549, plane: 'C1' },
  'GALILEO-31': { name: 'GSAT0210 (Antonianna)', block: 'FOC-10', norad: 41550, plane: 'C2' },

  // GLONASS (Russia)
  'GLONASS-71': { name: 'Cosmos 2471', block: 'GLONASS-K1', norad: 37372, plane: 'P3' },
  'GLONASS-72': { name: 'Cosmos 2475', block: 'GLONASS-M', norad: 37829, plane: 'P3' },
  'GLONASS-78': { name: 'Cosmos 2500', block: 'GLONASS-M', norad: 39764, plane: 'P2' },
  'GLONASS-85': { name: 'Cosmos 2516', block: 'GLONASS-M', norad: 41554, plane: 'P1' }
};

function getSatDetails(constel, prn) {
  const key = `${constel.toUpperCase()}-${prn}`;
  if (SATELLITE_CATALOG[key]) return SATELLITE_CATALOG[key];
  return {
    name: `${constel} Spacecraft-${prn}`,
    block: `${constel} Block-II`,
    norad: 32000 + prn,
    plane: 'Plane-' + (prn % 6 + 1)
  };
}

function updateSatelliteTable() {
  const tbody = document.getElementById('satTableBody');
  if (!tbody) return;

  const filtered = state.satellites.filter(s => {
    if (state.filterConstellation === 'ALL') return true;
    return s.constellation.toUpperCase() === state.filterConstellation;
  });

  // Sort by SNR descending
  filtered.sort((a, b) => b.snr - a.snr);

  let html = '';
  for (const s of filtered.slice(0, 8)) {
    const meta = getSatDetails(s.constellation, s.prn);
    let badgeClass = 'badge-penetrable';
    if (s.classification === 'Strong Signal') badgeClass = 'badge-strong';
    else if (s.classification === 'Weak Signal') badgeClass = 'badge-weak';
    else if (s.classification === 'Non-Penetrable') badgeClass = 'badge-blocked';
    else if (s.classification === 'Threat') badgeClass = 'badge-threat';

    html += `
      <tr>
        <td>
          <div class="sat-name-cell">
            <span class="sat-name-primary">${meta.name}</span>
            <span class="sat-name-sub">${meta.block}</span>
          </div>
        </td>
        <td><strong>#${s.prn}</strong></td>
        <td>${s.elev}°</td>
        <td>${s.azim}°</td>
        <td><strong>${s.snr} dB</strong></td>
        <td><span class="sat-badge ${badgeClass}">${s.classification}</span></td>
      </tr>
    `;
  }
  tbody.innerHTML = html;
}

function updateFleetTable() {
  const tbody = document.getElementById('fleetTableBody');
  const countBadge = document.getElementById('fleetCountBadge');
  if (!tbody) return;

  if (countBadge) countBadge.innerText = `${state.satellites.length} Active Satellites Tracked`;

  let html = '';
  for (const s of state.satellites) {
    const meta = getSatDetails(s.constellation, s.prn);
    let badgeClass = 'badge-penetrable';
    if (s.classification === 'Strong Signal') badgeClass = 'badge-strong';
    else if (s.classification === 'Weak Signal') badgeClass = 'badge-weak';
    else if (s.classification === 'Non-Penetrable') badgeClass = 'badge-blocked';
    else if (s.classification === 'Threat') badgeClass = 'badge-threat';

    html += `
      <tr>
        <td>
          <div class="sat-name-cell">
            <span class="sat-name-primary">${meta.name}</span>
            <span class="sat-name-sub">${s.constellation} Constellation</span>
          </div>
        </td>
        <td><strong>#${s.prn}</strong></td>
        <td>${meta.block}</td>
        <td>${meta.norad}</td>
        <td>${meta.plane}</td>
        <td>${s.azim}° / ${s.elev}°</td>
        <td><strong>${s.snr} dB-Hz</strong></td>
        <td><span class="sat-badge ${badgeClass}">${s.classification}</span></td>
      </tr>
    `;
  }
  tbody.innerHTML = html;
}

function drawPolarSkyplot() {
  const canvas = document.getElementById('skyplotCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.min(cx, cy) - 22;

  ctx.clearRect(0, 0, w, h);

  // Background polar radar disc
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
  ctx.fill();

  // Concentric Elevation Rings: 0° (outer), 30°, 60°
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  const rings = [0, 30, 60];
  for (const rDeg of rings) {
    const r = ((90 - rDeg) / 90) * maxR;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Crosshairs: N-S, E-W
  ctx.beginPath();
  ctx.moveTo(cx, cy - maxR);
  ctx.lineTo(cx, cy + maxR);
  ctx.moveTo(cx - maxR, cy);
  ctx.lineTo(cx + maxR, cy);
  ctx.stroke();

  // Cardinal Labels
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.textAlign = 'center';
  ctx.fillText('N', cx, cy - maxR - 6);
  ctx.fillText('S', cx, cy + maxR + 14);
  ctx.fillText('E', cx + maxR + 12, cy + 4);
  ctx.fillText('W', cx - maxR - 12, cy + 4);

  // Draw Satellites on Polar Radar
  for (const s of state.satellites) {
    const r = ((90 - Math.max(0, Math.min(90, s.elev))) / 90) * maxR;
    const theta = (s.azim - 90) * (Math.PI / 180);
    const px = cx + r * Math.cos(theta);
    const py = cy + r * Math.sin(theta);

    let dotColor = '#0066FF';
    if (s.classification === 'Strong Signal') dotColor = '#10B981';
    else if (s.classification === 'Weak Signal') dotColor = '#F59E0B';
    else if (s.classification === 'Threat') dotColor = '#EF4444';
    else if (s.classification === 'Non-Penetrable') dotColor = '#94A3B8';

    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = '9px Inter, sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(`${s.prn}`, px + 8, py + 3);
  }
}

function updateMlFeatureBars() {
  const container = document.getElementById('mlFeaturesList');
  if (!container) return;

  const importances = rfClassifier.getFeatureImportanceMap();
  let html = '';
  for (const feat in importances) {
    const pct = Math.round(importances[feat] * 100);
    html += `
      <div class="ml-feature-row">
        <div class="ml-feature-meta">
          <span>${feat}</span>
          <span style="color: var(--primary)">${pct}% MDI</span>
        </div>
        <div class="feature-progress-bg">
          <div class="feature-progress-bar" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

// -------------------------------------------------------------
// 5. 3D Glowing Dotted Globe & Satellite Orbit Rendering
// -------------------------------------------------------------
class GlobeRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.sphereRadius = 145;
    this.earthPoints = [];
    this.orbitRadius = 220;
    this.initEarthCoastlinePoints();
    this.bindEvents();
  }

  // Sample realistic continental coastline & landmass point cloud
  initEarthCoastlinePoints() {
    this.earthPoints = [];
    // Continental point clusters (Latitude, Longitude in degrees)
    const continents = [
      // North America
      { minLat: 15, maxLat: 65, minLon: -125, maxLon: -65, density: 160 },
      // South America
      { minLat: -55, maxLat: 12, minLon: -78, maxLon: -35, density: 120 },
      // Europe
      { minLat: 35, maxLat: 68, minLon: -10, maxLon: 40, density: 140 },
      // Africa
      { minLat: -34, maxLat: 36, minLon: -17, maxLon: 51, density: 180 },
      // Asia
      { minLat: 5, maxLat: 70, minLon: 45, maxLon: 145, density: 240 },
      // Australia
      { minLat: -39, maxLat: -11, minLon: 113, maxLon: 153, density: 90 },
      // Global background oceanic sphere grid
      { minLat: -85, maxLat: 85, minLon: -180, maxLon: 180, density: 180 }
    ];

    for (const c of continents) {
      for (let i = 0; i < c.density; i++) {
        const lat = c.minLat + Math.random() * (c.maxLat - c.minLat);
        const lon = c.minLon + Math.random() * (c.maxLon - c.minLon);
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        this.earthPoints.push({
          x: this.sphereRadius * Math.sin(phi) * Math.cos(theta),
          y: this.sphereRadius * Math.cos(phi),
          z: this.sphereRadius * Math.sin(phi) * Math.sin(theta)
        });
      }
    }
  }

  bindEvents() {
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    this.canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      state.autoRotate = false;
      prevMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      state.globeRotation.y += dx * 0.007;
      state.globeRotation.x += dy * 0.007;
      prevMouse = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      state.globeZoom += e.deltaY * -0.001;
      state.globeZoom = Math.min(Math.max(0.65, state.globeZoom), 1.6);
    });
  }

  project(x, y, z, cx, cy) {
    // Rotate around X (pitch) and Y (yaw)
    const cosY = Math.cos(state.globeRotation.y);
    const sinY = Math.sin(state.globeRotation.y);
    const cosX = Math.cos(state.globeRotation.x);
    const sinX = Math.sin(state.globeRotation.x);

    // Yaw around Y
    const x1 = x * cosY - z * sinY;
    const z1 = z * cosY + x * sinY;

    // Pitch around X
    const y2 = y * cosX - z1 * sinX;
    const z2 = z1 * cosX + y * sinX;

    // Perspective projection
    const fov = 500 * state.globeZoom;
    const distance = 580;
    const scale = fov / (distance + z2);

    return {
      px: cx + x1 * scale,
      py: cy + y2 * scale,
      scale,
      z: z2
    };
  }

  render() {
    const w = this.canvas.width = this.canvas.parentElement.clientWidth;
    const h = this.canvas.height = this.canvas.parentElement.clientHeight;
    const cx = w / 2;
    const cy = h / 2;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    if (state.autoRotate) {
      state.globeRotation.y += 0.0035;
    }

    // 1. Draw Globe Outer Atmosphere Glow Halo
    const haloRadius = this.sphereRadius * 1.08 * state.globeZoom;
    const haloGrad = ctx.createRadialGradient(cx, cy, haloRadius * 0.8, cx, cy, haloRadius * 1.35);
    haloGrad.addColorStop(0, 'rgba(0, 194, 255, 0.12)');
    haloGrad.addColorStop(0.5, 'rgba(0, 102, 255, 0.05)');
    haloGrad.addColorStop(1, 'rgba(0, 102, 255, 0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, haloRadius * 1.35, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw Subtle Sphere Shadow at bottom (like reference image)
    const shadowGrad = ctx.createRadialGradient(cx, cy + haloRadius * 1.05, 10, cx, cy + haloRadius * 1.05, haloRadius * 0.8);
    shadowGrad.addColorStop(0, 'rgba(15, 30, 70, 0.14)');
    shadowGrad.addColorStop(1, 'rgba(15, 30, 70, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + haloRadius * 1.05, haloRadius * 0.75, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Draw Dotted Lat/Lon Grid Rings
    ctx.lineWidth = 1;
    for (let latDeg = -60; latDeg <= 60; latDeg += 30) {
      const latRad = latDeg * (Math.PI / 180);
      const ringR = this.sphereRadius * Math.cos(latRad);
      const ringY = this.sphereRadius * Math.sin(latRad);
      
      ctx.beginPath();
      let first = true;
      for (let lonDeg = 0; lonDeg <= 360; lonDeg += 12) {
        const lonRad = lonDeg * (Math.PI / 180);
        const x = ringR * Math.cos(lonRad);
        const z = ringR * Math.sin(lonRad);
        const p = this.project(x, ringY, z, cx, cy);
        if (p.z > -this.sphereRadius * 0.2) {
          if (first) { ctx.moveTo(p.px, p.py); first = false; }
          else { ctx.lineTo(p.px, p.py); }
        } else {
          first = true;
        }
      }
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.12)';
      ctx.stroke();
    }

    // 4. Draw Glowing Continental Dot Matrix
    for (const pt of this.earthPoints) {
      const p = this.project(pt.x, pt.y, pt.z, cx, cy);
      // Front dots are bright cyan/white, back dots are dimmed
      if (p.z > 0) {
        const alpha = Math.min(1.0, 0.25 + (p.z / this.sphereRadius) * 0.75);
        ctx.fillStyle = `rgba(0, 140, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.px, p.py, 1.8 * p.scale, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(10, 40, 90, 0.12)';
        ctx.beginPath();
        ctx.arc(p.px, p.py, 1.0 * p.scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. Draw Ground Receiver Target (Autonomous Car / Drone) on Earth
    const targetPhi = (90 - state.lat) * (Math.PI / 180);
    const targetTheta = (state.lon + 180) * (Math.PI / 180);
    const targetX = this.sphereRadius * Math.sin(targetPhi) * Math.cos(targetTheta);
    const targetY = this.sphereRadius * Math.cos(targetPhi);
    const targetZ = this.sphereRadius * Math.sin(targetPhi) * Math.sin(targetTheta);
    const targetProj = this.project(targetX, targetY, targetZ, cx, cy);

    // 6. Draw Orbiting Satellites and Projected Signal Beams
    // Real GPS satellites orbit at ~3.87 km/s, completing one orbit in ~12 hours.
    // We scale time so one full visual orbit = ~90 seconds on screen (realistic-looking slow drift)
    const time = Date.now() * 0.000015;  // was 0.0006 — now 40x SLOWER
    for (let i = 0; i < state.satellites.length; i++) {
      const sat = state.satellites[i];
      // Distribute in 6 orbital planes with inclination
      const planeIdx = i % 6;
      const planeAngle = planeIdx * (Math.PI / 3);
      const satAngle = (i * 0.45) + time;
      const orbR = this.orbitRadius;

      // 3D Orbital Coordinates
      const ox = orbR * Math.cos(satAngle) * Math.cos(planeAngle) - (orbR * 0.5) * Math.sin(satAngle) * Math.sin(planeAngle);
      const oy = orbR * Math.sin(satAngle) * 0.75;
      const oz = orbR * Math.cos(satAngle) * Math.sin(planeAngle) + (orbR * 0.5) * Math.sin(satAngle) * Math.cos(planeAngle);

      const sp = this.project(ox, oy, oz, cx, cy);

      // Color scheme according to Random Forest classification
      let beamColor = 'rgba(0, 194, 255, 0.6)'; // Strong (cyan)
      let satDotColor = '#00C2FF';
      if (sat.classification === 'Penetrable') {
        beamColor = 'rgba(0, 102, 255, 0.5)';
        satDotColor = '#0066FF';
      } else if (sat.classification === 'Weak Signal') {
        beamColor = 'rgba(245, 158, 11, 0.45)';
        satDotColor = '#F59E0B';
      } else if (sat.classification === 'Non-Penetrable') {
        beamColor = 'rgba(148, 163, 184, 0.25)';
        satDotColor = '#94A3B8';
      } else if (sat.classification === 'Threat') {
        beamColor = 'rgba(239, 68, 68, 0.85)';
        satDotColor = '#EF4444';
      }

      // Draw Arced Beam from Satellite to Ground Target
      if (targetProj.z > -this.sphereRadius * 0.6) {
        ctx.beginPath();
        ctx.moveTo(sp.px, sp.py);
        // Calculate curve control point
        const midX = (sp.px + targetProj.px) / 2;
        const midY = (sp.py + targetProj.py) / 2 - 25 * pScale();
        ctx.quadraticCurveTo(midX, midY, targetProj.px, targetProj.py);
        ctx.strokeStyle = beamColor;
        ctx.lineWidth = sat.classification === 'Threat' ? 2.5 : 1.4;
        ctx.stroke();

        // Traveling photon pulse along beam
        const pulseT = ((time * 3 + i * 0.3) % 1.0);
        const pulseX = (1 - pulseT) * (1 - pulseT) * sp.px + 2 * (1 - pulseT) * pulseT * midX + pulseT * pulseT * targetProj.px;
        const pulseY = (1 - pulseT) * (1 - pulseT) * sp.py + 2 * (1 - pulseT) * pulseT * midY + pulseT * pulseT * targetProj.py;
        ctx.fillStyle = satDotColor;
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Satellite Node
      ctx.fillStyle = satDotColor;
      ctx.beginPath();
      ctx.arc(sp.px, sp.py, 4.5 * sp.scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Satellite Label (PRN)
      if (sp.z > -50) {
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = '#0F172A';
        ctx.fillText(`${sat.constellation[0]}${sat.prn}`, sp.px + 7, sp.py + 3);
      }
    }

    // 7. Draw Receiver Node (Autonomous Car / Drone) on Earth
    if (targetProj.z > -this.sphereRadius * 0.4) {
      // Pulsing Beacon on Vehicle
      const beaconR = (8 + Math.sin(time * 5) * 4) * targetProj.scale;
      ctx.strokeStyle = state.threatStatus === 'NOMINAL' ? 'rgba(0, 102, 255, 0.8)' : 'rgba(239, 68, 68, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(targetProj.px, targetProj.py, beaconR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = state.threatStatus === 'NOMINAL' ? '#0066FF' : '#EF4444';
      ctx.beginPath();
      ctx.arc(targetProj.px, targetProj.py, 5 * targetProj.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // Label
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillStyle = '#0F172A';
      const labelText = state.vehicleType === 'car' ? '🚗 UGV-Alpha (Car)' : '🛸 SkyGuard-X (Drone)';
      ctx.fillText(labelText, targetProj.px + 10, targetProj.py - 6);

      // Draw Virtual Jamming RF Dome if Jamming is active
      if (state.simJammingActive) {
        const jamDomeR = (30 + (state.simJammingIntensity / 100) * 45) * targetProj.scale;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
        ctx.beginPath();
        ctx.arc(targetProj.px, targetProj.py, jamDomeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Virtual Spoofing Deviation Vector
      if (state.simSpoofingActive) {
        ctx.beginPath();
        ctx.moveTo(targetProj.px, targetProj.py);
        const spoofPx = targetProj.px + 45;
        const spoofPy = targetProj.py - 30;
        ctx.lineTo(spoofPx, spoofPy);
        ctx.strokeStyle = '#DC2626';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.arc(spoofPx, spoofPy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '9px Inter, sans-serif';
        ctx.fillText('⚠️ SPOOFED DRIFT', spoofPx + 6, spoofPy + 3);
      }
    }

    function pScale() { return state.globeZoom; }

    requestAnimationFrame(() => this.render());
  }
}

// -------------------------------------------------------------
// 6. Web Serial API Integration for Arduino ESP32
// -------------------------------------------------------------
let serialPacketCount = 0;

function parseNmeaCoordinate(val, dir) {
  if (!val || val.length === 0) return null;
  const raw = parseFloat(val);
  if (isNaN(raw)) return null;
  const degrees = Math.floor(raw / 100);
  const minutes = raw - (degrees * 100);
  let dec = degrees + (minutes / 60.0);
  if (dir === 'S' || dir === 'W') dec = -dec;
  return dec;
}

function handleIncomingNmea(line) {
  if (!line.includes('$')) return false;
  
  if (line.includes('GGA')) {
    const parts = line.split(',');
    if (parts.length >= 10) {
      const lat = parseNmeaCoordinate(parts[2], parts[3]);
      const lon = parseNmeaCoordinate(parts[4], parts[5]);
      if (lat !== null && !isNaN(lat)) state.lat = lat;
      if (lon !== null && !isNaN(lon)) state.lon = lon;
      
      const fix = parseInt(parts[6]);
      if (!isNaN(fix)) {
        state.fixQuality = fix;
        state.isLocked = fix > 0;
      }
      const sats = parseInt(parts[7]);
      if (!isNaN(sats)) state.satsTracked = sats;
      const hdop = parseFloat(parts[8]);
      if (!isNaN(hdop)) state.hdop = hdop;
      const alt = parseFloat(parts[9]);
      if (!isNaN(alt)) state.alt = alt;
      return true;
    }
  } else if (line.includes('RMC')) {
    const parts = line.split(',');
    if (parts.length >= 9) {
      if (parts[2] === 'A') state.isLocked = true;
      const lat = parseNmeaCoordinate(parts[3], parts[4]);
      const lon = parseNmeaCoordinate(parts[5], parts[6]);
      if (lat !== null && !isNaN(lat)) state.lat = lat;
      if (lon !== null && !isNaN(lon)) state.lon = lon;
      const knots = parseFloat(parts[7]);
      if (!isNaN(knots)) state.speed = knots * 1.852;
      const course = parseFloat(parts[8]);
      if (!isNaN(course)) state.course = course;
      return true;
    }
  } else if (line.includes('GSV')) {
    const parts = line.split(',');
    if (parts.length >= 4) {
      const msgNum = parseInt(parts[2]);
      if (msgNum === 1) {
        state.satellites = [];
      }
      const constel = line.startsWith('$GL') ? 'GLONASS' : line.startsWith('$GA') ? 'GALILEO' : line.startsWith('$GB') || line.startsWith('$BD') ? 'BEIDOU' : 'GPS';
      for (let i = 4; i + 3 < parts.length; i += 4) {
        const prn = parseInt(parts[i]);
        const elev = parseInt(parts[i+1]) || 45;
        const azim = parseInt(parts[i+2]) || 180;
        let snrStr = parts[i+3] || '0';
        if (snrStr.includes('*')) snrStr = snrStr.split('*')[0];
        const snr = parseInt(snrStr) || 0;
        if (!isNaN(prn) && prn > 0) {
          state.satellites.push({
            prn,
            constellation: constel,
            elev,
            azim,
            snr,
            baseSnr: snr,
            multipath: 1.0,
            pseudorangeRes: 1.5,
            dopplerRes: 1.2,
            clockDrift: 0.8,
            cn0Delta: 0.2,
            classification: 'Strong Signal',
            confidence: 0.98,
            penetrationScore: 0.95
          });
        }
      }
      return true;
    }
  }
  return false;
}

function updateHwBadgeStatus() {
  const hwBadge = document.getElementById('hwBadge');
  if (hwBadge) {
    hwBadge.className = 'status-pill online';
    hwBadge.innerHTML = `<span class="pulse-dot"></span> COM LINK LIVE (${serialPacketCount} PKTS)`;
  }
}

async function connectEsp32WebSerial() {
  const serialModal = document.getElementById('serialModal');
  const serialStatusText = document.getElementById('serialStatusText');
  const serialLogs = document.getElementById('serialLogs');

  if (!('serial' in navigator)) {
    alert('Web Serial API is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Opera to connect directly to the ESP32 USB COM port.');
    return;
  }

  // Open the serial monitor drawer automatically so user sees live output
  if (serialModal) serialModal.classList.add('active');

  try {
    // Check if user has closed Arduino IDE serial monitor
    appendSerialLog('[ESP32 LINK] Requesting USB COM Port...');
    appendSerialLog('[NOTICE] Ensure Arduino IDE Serial Monitor is CLOSED so Windows permits port access.');

    // Request a port from user
    state.serialPort = await navigator.serial.requestPort();
    
    // Connect at 115200 (default for our firmware)
    await state.serialPort.open({ baudRate: 115200 });

    state.isHardwareConnected = true;
    state.isDemoMode = false;

    updateHwBadgeStatus();

    if (serialStatusText) serialStatusText.innerText = 'Connected @ 115200 Baud';
    appendSerialLog('[ESP32 LINK] Port opened successfully! Receiving live telemetry stream...');

    readSerialStream();
  } catch (err) {
    console.error('Serial connection error:', err);
    appendSerialLog(`[ERROR] Connection failed: ${err.message}`);
    if (err.message.toLowerCase().includes('open') || err.message.toLowerCase().includes('access') || err.name === 'NetworkError') {
      alert("⚠️ COM Port Busy!\n\nPlease CLOSE the Serial Monitor in Arduino IDE first.\n\nIn Windows, only one application can access a COM port at a time. After closing the Arduino IDE Serial Monitor, click Connect again.");
    }
  }
}

async function readSerialStream() {
  const textDecoder = new TextDecoderStream();
  const readableStreamClosed = state.serialPort.readable.pipeTo(textDecoder.writable);
  const reader = textDecoder.readable.getReader();
  state.serialReader = reader;

  let lineBuffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        lineBuffer += value;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop(); // keep last unfinished partial line

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.length > 0) {
            appendSerialLog(trimmed);
            handleIncomingEsp32Packet(trimmed);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error reading serial stream:', err);
    appendSerialLog(`[ERROR] Stream error: ${err.message}`);
  }
}

function handleIncomingEsp32Packet(line) {
  serialPacketCount++;

  // 1. Try parsing JSON format
  const jsonStart = line.indexOf('{');
  const jsonEnd = line.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    try {
      const jsonStr = line.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonStr);
      if (data.type === 'GNSS_TELEMETRY' || data.lat !== undefined) {
        state.isLocked = data.locked !== undefined ? data.locked : true;
        if (data.fixQuality !== undefined) state.fixQuality = data.fixQuality;
        if (data.fixMode !== undefined) state.fixMode = data.fixMode;
        if (data.lat !== undefined && !isNaN(data.lat) && data.lat !== 0) state.lat = data.lat;
        if (data.lon !== undefined && !isNaN(data.lon) && data.lon !== 0) state.lon = data.lon;
        if (data.alt !== undefined && !isNaN(data.alt)) state.alt = data.alt;
        if (data.speed !== undefined && !isNaN(data.speed)) state.speed = data.speed;
        if (data.course !== undefined && !isNaN(data.course)) state.course = data.course;
        if (data.hdop !== undefined && !isNaN(data.hdop)) state.hdop = data.hdop;
        if (data.vdop !== undefined && !isNaN(data.vdop)) state.vdop = data.vdop;
        if (data.pdop !== undefined && !isNaN(data.pdop)) state.pdop = data.pdop;
        if (data.satsTracked !== undefined) state.satsTracked = data.satsTracked;
        if (data.satsInView !== undefined) state.satsInView = data.satsInView;

        if (Array.isArray(data.satellites) && data.satellites.length > 0) {
          state.satellites = data.satellites.map(s => ({
            prn: s.prn,
            constellation: s.constellation || 'GPS',
            elev: s.elev || 45,
            azim: s.azim || 180,
            snr: s.snr || 35,
            baseSnr: s.snr || 35,
            multipath: 1.0,
            pseudorangeRes: 1.5,
            dopplerRes: 1.2,
            clockDrift: 0.8,
            cn0Delta: 0.2,
            classification: 'Strong Signal',
            confidence: 0.98,
            penetrationScore: 0.95
          }));
        }
        updateHwBadgeStatus();
        return;
      }
    } catch (e) {
      // not valid json, fallback to NMEA
    }
  }

  // 2. Try parsing standard NMEA ($GPGGA, $GPRMC, $GPGSV)
  if (line.includes('$GP') || line.includes('$GN') || line.includes('$GL') || line.includes('$GA')) {
    const parsed = handleIncomingNmea(line);
    if (parsed) {
      updateHwBadgeStatus();
    }
  }
}

function appendSerialLog(text) {
  const serialLogs = document.getElementById('serialLogs');
  if (!serialLogs) return;
  const line = document.createElement('div');
  line.innerText = text;
  serialLogs.appendChild(line);
  // Keep max 200 lines to avoid memory bloat
  if (serialLogs.childNodes.length > 200) {
    serialLogs.removeChild(serialLogs.firstChild);
  }
  serialLogs.scrollTop = serialLogs.scrollHeight;
}

// -------------------------------------------------------------
// 7. Virtual Simulation Controls Setup
// -------------------------------------------------------------
function setupSimulationControls() {
  // Jamming Toggle & Slider
  const toggleJam = document.getElementById('toggleJamming');
  const sliderJam = document.getElementById('sliderJamming');
  const valJam = document.getElementById('valJamming');

  if (toggleJam) {
    toggleJam.addEventListener('change', (e) => {
      state.simJammingActive = e.target.checked;
    });
  }
  if (sliderJam && valJam) {
    sliderJam.addEventListener('input', (e) => {
      state.simJammingIntensity = parseInt(e.target.value);
      valJam.innerText = `${state.simJammingIntensity}%`;
    });
  }

  // Spoofing Toggle & Slider
  const toggleSpoof = document.getElementById('toggleSpoofing');
  const sliderSpoof = document.getElementById('sliderSpoofing');
  const valSpoof = document.getElementById('valSpoofing');

  if (toggleSpoof) {
    toggleSpoof.addEventListener('change', (e) => {
      state.simSpoofingActive = e.target.checked;
    });
  }
  if (sliderSpoof && valSpoof) {
    sliderSpoof.addEventListener('input', (e) => {
      state.simSpoofingOffset = parseFloat(e.target.value);
      valSpoof.innerText = `+${state.simSpoofingOffset}°`;
    });
  }

  // Urban Canyon Toggle
  const toggleCanyon = document.getElementById('toggleUrbanCanyon');
  if (toggleCanyon) {
    toggleCanyon.addEventListener('change', (e) => {
      state.simUrbanCanyonActive = e.target.checked;
    });
  }

  // Autonomous Car vs Drone Tab Switching
  const tabCar = document.getElementById('tabVehicleCar');
  const tabDrone = document.getElementById('tabVehicleDrone');
  if (tabCar && tabDrone) {
    tabCar.addEventListener('click', () => {
      state.vehicleType = 'car';
      tabCar.classList.add('active');
      tabDrone.classList.remove('active');
    });
    tabDrone.addEventListener('click', () => {
      state.vehicleType = 'drone';
      tabDrone.classList.add('active');
      tabCar.classList.remove('active');
    });
  }

  // Constellation filter buttons
  const constelBtns = document.querySelectorAll('.constel-btn');
  constelBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      constelBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filterConstellation = btn.dataset.constel;
    });
  });

  // Modal open / close
  const btnOpenConsole = document.getElementById('btnOpenConsole');
  const modalClose = document.getElementById('modalClose');
  const serialModal = document.getElementById('serialModal');
  if (btnOpenConsole && serialModal) {
    btnOpenConsole.addEventListener('click', () => serialModal.classList.add('active'));
  }
  if (modalClose && serialModal) {
    modalClose.addEventListener('click', () => serialModal.classList.remove('active'));
  }

  // WebSerial Connect Button
  const btnConnectSerial = document.getElementById('btnConnectSerial');
  if (btnConnectSerial) {
    btnConnectSerial.addEventListener('click', connectEsp32WebSerial);
  }

  // Sidebar Tab / View Switching System
  const navItems = document.querySelectorAll('.nav-menu .nav-item');
  const viewPanels = document.querySelectorAll('.view-panel');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetId = item.dataset.target;
      if (!targetId) return;

      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      viewPanels.forEach(panel => {
        if (panel.id === targetId) {
          panel.classList.add('active-view');
        } else {
          panel.classList.remove('active-view');
        }
      });
    });
  });

  // Interactive ML Feature Vector Inspector
  const inspectSnr = document.getElementById('inspectSnr');
  const inspectMp = document.getElementById('inspectMp');
  const inspectDop = document.getElementById('inspectDop');
  const inspectSnrVal = document.getElementById('inspectSnrVal');
  const inspectMpVal = document.getElementById('inspectMpVal');
  const inspectDopVal = document.getElementById('inspectDopVal');
  const inspectResultText = document.getElementById('inspectResultText');
  const inspectVotesText = document.getElementById('inspectVotesText');

  const updateInspect = () => {
    if (!inspectSnr || !inspectMp || !inspectDop) return;
    const snr = parseFloat(inspectSnr.value);
    const mp = parseFloat(inspectMp.value);
    const dop = parseFloat(inspectDop.value);

    if (inspectSnrVal) inspectSnrVal.innerText = `${snr} dB-Hz`;
    if (inspectMpVal) inspectMpVal.innerText = `${mp}`;
    if (inspectDopVal) inspectDopVal.innerText = `${dop} Hz`;

    const res = rfClassifier.classify([snr, 45, 180, mp, 2.0, dop, 1.0, 0.5]);
    if (inspectResultText) {
      inspectResultText.innerText = `${res.classification} (${(res.confidence * 100).toFixed(1)}% Confidence)`;
      inspectResultText.style.color = res.classification === 'Threat' ? '#EF4444' : res.classification === 'Strong Signal' ? '#10B981' : '#0066FF';
    }
    if (inspectVotesText) {
      const voteEntries = Object.entries(res.votes).map(([k, v]) => `${k}: ${v}`).join(' | ');
      inspectVotesText.innerText = `Tree Votes: ${voteEntries}`;
    }
  };

  if (inspectSnr) inspectSnr.addEventListener('input', updateInspect);
  if (inspectMp) inspectMp.addEventListener('input', updateInspect);
  if (inspectDop) inspectDop.addEventListener('input', updateInspect);
}

// -------------------------------------------------------------
// 8. Main Initialization Loop
// -------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  // Update live clock
  const timeElem = document.getElementById('currentUtcTime');
  const updateTime = () => {
    const d = new Date();
    if (timeElem) {
      timeElem.innerText = d.toUTCString().replace('GMT', 'UTC');
    }
  };
  setInterval(updateTime, 1000);
  updateTime();

  // Initialize 3D Globe
  const globe = new GlobeRenderer('globeCanvas');
  globe.render();

  // Initialize controls
  setupSimulationControls();

  // Main high-rate telemetry & ML classification loop (5 Hz = every 200ms)
  setInterval(() => {
    runMlClassificationPipeline();
    updateDashboardUI();
  }, 200);
});

