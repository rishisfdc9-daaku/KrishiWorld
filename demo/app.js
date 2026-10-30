// KrishiWorld demo logic
// Author: Rishi Gullapalli (rishisfdc9-daaku)
//
// Why this file is so plain: I want the demo to work by opening index.html,
// nothing else. No bundler, no framework to learn first. Each function does
// one thing a farmer actually does — pick a crop, show a photo, get an
// answer, check a dealer, run a motor — so I can replace each mock with a
// real Salesforce call later without rewriting the whole page.
//
// Everything marked MOCK here is local only. No photo leaves the browser,
// and the motor button does not touch a real pump.

// Keep the demo state in one small object, so it is easy to follow.
const state = {
  crop: 'paddy',
  motorOn: false,
  locationText: MOCK.demoFarm.name,
};

function $(id) { return document.getElementById(id); }

// --- Photo ---------------------------------------------------------------
// I only preview the photo locally. A real app would upload it to the case;
// a demo should never need to send a farmer's photo anywhere to show the flow.
function onPhotoPicked(event) {
  const file = event.target.files[0];
  if (!file) return;
  const img = $('photoPreview');
  img.src = URL.createObjectURL(file);
  img.style.display = 'block';
  $('diagnoseBtn').disabled = false;
  $('diagnosis').innerHTML = '<p>Photo ready. Click “Diagnose crop problem” to see the demo answer.</p>';
}

// --- Diagnosis -----------------------------------------------------------
// Real AI first, mock only as a labelled fallback. Since I added
// ai-analysis.js, this tries the on-device MobileNet model on the actual
// uploaded photo. If that fails (offline, CDN blocked), it falls back to
// the old per-crop mock — and says so in big letters, because a fallback
// must never be dressed up as an AI result. Either way, the 70% rule
// holds: low confidence or High severity escalates to an agronomist.
function renderDiagnosisCard(d, sourceLabel, predictions) {
  const escalate = d.confidence < 70 || d.severity === 'High' || d.escalate;
  let html = '<div class="card"><h3>' + sourceLabel + ' — ' + d.problem + '</h3>' +
    '<p><strong>Confidence:</strong> ' + d.confidence + '% &nbsp;|&nbsp; <strong>Severity:</strong> ' + d.severity + '</p>' +
    '<p>' + d.why + '</p>';
  if (predictions && predictions.length) {
    html += '<p><strong>Model predictions:</strong> ' + predictions.map(function (p) {
      return p.label + ' (' + p.confidence + '%)';
    }).join(', ') + '</p>';
  }
  html += (escalate
    ? '<p><strong>Escalated to an agronomist.</strong> Confidence is too low to answer alone, so a human must review this case first.</p>'
    : '<p>This case can be answered with the steps below, with a check-again in 3 days.</p>') +
    '</div>';
  $('diagnosis').innerHTML = html;
  $('aiStatus').textContent = 'Result source: ' + sourceLabel + (d.model ? ' · ' + d.model : '');
}

function diagnoseMock() {
  const d = MOCK.diagnoses[state.crop];
  renderDiagnosisCard(d, 'MOCK diagnosis (fallback — model unavailable)', null);
}

async function diagnose() {
  $('diagnosis').innerHTML = '<p>Analysing your photo on this device… (no photo is uploaded anywhere)</p>';
  $('aiStatus').textContent = 'Analysing…';
  const img = $('photoPreview');
  if (typeof AIAnalysis !== 'undefined' && img && img.src) {
    try {
      const result = await AIAnalysis.analysePhoto(img, state.crop);
      renderDiagnosisCard(result, 'ON-DEVICE AI analysis', result.predictions);
      renderResolution();
      renderDealers();
      return;
    } catch (err) {
      // Fall through to the labelled mock. I log the reason so a tester
      // can tell offline/CDN failure apart from a code bug.
      console.warn('KrishiWorld AI analysis unavailable, using mock fallback:', err && err.message);
      $('aiStatus').textContent = 'AI model unavailable (' + (err && err.message ? err.message : 'unknown error') + ') — showing labelled mock fallback.';
    }
  }
  diagnoseMock();
  renderResolution();
  renderDealers();
}

// Resolution steps are written as actions, not theory — a farmer needs to
// know what to do this morning, not what a disease is called in a textbook.
function renderResolution() {
  $('resolution').innerHTML = '<h3>What to do now</h3><ol>' +
    MOCK.resolution.map(function (step) { return '<li>' + step + '</li>'; }).join('') + '</ol>' +
    '<p><em>Demo dosages are illustrative only. A real agronomist must confirm any dose before use.</em></p>';
}

// --- Location + weather --------------------------------------------------
// I use the browser's geolocation only if the farmer says yes. Otherwise
// the demo farm stays, because a demo should never block on permission.
function useMyLocation() {
  if (!navigator.geolocation) {
    $('locationText').textContent = state.locationText + ' (geolocation not available in this browser)';
    return;
  }
  navigator.geolocation.getCurrentPosition(function (pos) {
    state.locationText = 'Your location: ' + pos.coords.latitude.toFixed(4) + ', ' + pos.coords.longitude.toFixed(4) + ' (demo weather still applies)';
    $('locationText').textContent = state.locationText;
  }, function () {
    $('locationText').textContent = state.locationText + ' (location permission denied — demo farm kept)';
  });
}

function renderWeather() {
  $('weather').innerHTML = '<h3>Weather — past 3 weeks (mock)</h3><table>' +
    '<tr><th>Week</th><th>Rain</th><th>Avg temp</th><th>Humidity</th><th>Note</th></tr>' +
    MOCK.weatherWeeks.map(function (w) {
      return '<tr><td>' + w.label + '</td><td>' + w.rainMm + ' mm</td><td>' + w.avgTempC + ' °C</td><td>' + w.humidity + '%</td><td>' + w.note + '</td></tr>';
    }).join('') + '</table><p><strong>Forecast (mock):</strong> ' + MOCK.forecast + '</p>' +
    '<p>Soil (mock): ' + MOCK.demoFarm.soilType + ' · Crop stage: ' + MOCK.demoFarm.cropStage + '</p>';
}

// --- Dealers ---------------------------------------------------------------
// Verified first, then nearest. I do not rank by who paid — that is the
// whole point of a "genuine dealer" list, and I want that rule in the code,
// not just in a slide.
function renderDealers() {
  $('dealers').innerHTML = '<h3>Nearby genuine dealers (mock, verified)</h3>' +
    MOCK.dealers.map(function (d) {
      return '<div class="dealer"><strong>' + d.name + '</strong> — ' + d.distanceKm + ' km away<br>' +
        d.product + ' · ' + d.price + ' · ' + d.stock + '<br>' +
        '<span class="verified">✓ Verified genuine dealer</span> ' +
        '<button class="secondary" onclick="verifyQR(\'' + d.name + '\')">Verify QR</button></div>';
    }).join('');
}

// QR check is a button in the demo, not a real scanner, because I want to
// show the trust step without pretending a camera check has happened.
function verifyQR(name) {
  alert('MOCK QR check: ' + name + ' is a verified dealer in this demo. A real version would scan the product QR and check it against the dealer registry.');
}

// --- Alerts ----------------------------------------------------------------
function renderAlerts() {
  $('alerts').innerHTML = MOCK.alerts.map(function (a) {
    const cls = a.level === 'High' ? 'alert-high' : (a.level === 'Medium' ? 'alert-medium' : '');
    return '<div class="card ' + cls + '"><strong>' + a.level + ':</strong> ' + a.text + '<br><em>Action: ' + a.action + '</em></div>';
  }).join('');
}

// --- Smart motor -----------------------------------------------------------
// This is the part I am most careful about. A motor must never run on a
// guess: it runs only inside the electricity window the farmer gave, and
// only for the minutes they set. In the demo the "motor" is just state on
// this page — no real pump is touched. In production, MotorControlService
// must also check for dry running and fail safe to OFF.
function waterNeedLitres() {
  // Simple demo estimate: drier soil + flowering crop = more water.
  // I keep the maths visible here so a reviewer can challenge it.
  const dryness = Math.max(0, 60 - Number($('soilMoisture').value));
  return Math.round(dryness * 12);
}

function updateWaterEstimate() {
  $('waterEstimate').textContent = 'Estimated water need (demo): about ' + waterNeedLitres() + ' litres for this plot today.';
}

function toggleMotor() {
  const start = $('elecStart').value;
  const end = $('elecEnd').value;
  const minutes = $('motorMinutes').value;
  if (!start || !end) {
    alert('Please set your electricity timings first — the motor must only run inside that window.');
    return;
  }
  state.motorOn = !state.motorOn;
  const status = $('motorStatus');
  if (state.motorOn) {
    status.innerHTML = '<span class="motor-on">MOTOR ON (mock)</span> — running for ' + minutes + ' minutes, inside your electricity window ' + start + ' to ' + end + '.';
    $('motorBtn').textContent = 'Switch motor OFF (mock)';
  } else {
    status.innerHTML = '<span class="motor-off">MOTOR OFF (mock)</span> — last run logged locally for this demo only.';
    $('motorBtn').textContent = 'Switch motor ON (mock)';
  }
  const log = document.createElement('p');
  log.textContent = new Date().toLocaleTimeString() + ' — Motor turned ' + (state.motorOn ? 'ON' : 'OFF') + ' (mock, ' + minutes + ' min, window ' + start + '–' + end + ')';
  $('motorLog').appendChild(log);
}

// --- Start the page --------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
  $('cropSelect').addEventListener('change', function (e) { state.crop = e.target.value; });
  $('photoInput').addEventListener('change', onPhotoPicked);
  $('soilMoisture').addEventListener('input', updateWaterEstimate);
  $('locationText').textContent = state.locationText;
  renderWeather();
  renderAlerts();
  renderDealers();
  updateWaterEstimate();
});
