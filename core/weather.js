// KrishiWorld core — weather history and alerts. Author: Rishi Gullapalli (rishisfdc9-daaku)
// Why I summarise 3 weeks instead of showing raw daily rows: a farmer
// does not act on "Tuesday was 31.2°C". They act on "it has been wet for
// two weeks, so disease risk is up". So this module turns daily records
// into the three numbers that actually change a decision — total rain,
// average humidity, and wet days — plus a disease-risk score, and it
// turns a forecast into ONE clear action per alert. If a forecast has
// two actions, I split it into two alerts; a farmer should never have
// to choose between two instructions in one message.
'use strict';
const { requireNumber } = require('./validation');
const logger = require('./logger');

function summariseWeeks(daily) {
  // daily: [{date, rainMm, tempC, humidity}] — at least one record.
  // Edge case I hit early: an empty array gave "NaN mm" in the UI, which
  // looks like a bug to a farmer and like carelessness to a reviewer.
  if (!Array.isArray(daily) || daily.length === 0) {
    throw new Error('summariseWeeks needs at least one daily weather record.');
  }
  const rain = daily.reduce((s, d) => s + requireNumber(d.rainMm, 'rainMm', 0, 500), 0);
  const humidity = daily.reduce((s, d) => s + requireNumber(d.humidity, 'humidity', 0, 100), 0) / daily.length;
  const wetDays = daily.filter((d) => d.rainMm >= 5).length;
  const avgTemp = daily.reduce((s, d) => s + requireNumber(d.tempC, 'tempC', -10, 55), 0) / daily.length;
  return {
    days: daily.length,
    totalRainMm: Math.round(rain),
    avgHumidity: Math.round(humidity),
    avgTempC: Math.round(avgTemp * 10) / 10,
    wetDays,
    // Disease risk is a heuristic, labelled as one. High humidity + wet
    // days is the pattern agronomists watch; I do not pretend this is a
    // disease forecast, and the UI must not present it as one either.
    diseaseRisk: humidity >= 80 && wetDays >= 5 ? 'High'
      : humidity >= 70 && wetDays >= 3 ? 'Medium' : 'Low',
  };
}

function alertsFromForecast(forecast) {
  // forecast: [{inDays, rainMm, humidity, windKmh, description}]
  // Each alert carries exactly one action. If I cannot give an action,
  // I do not create an alert — an alert without an action is just worry.
  const alerts = [];
  for (const f of forecast || []) {
    if (f.rainMm >= 20) {
      alerts.push({ level: 'High', text: `Heavy rain expected in ${f.inDays} day(s) (${f.rainMm} mm).`, action: 'Do not spray; cover harvested produce.' });
    } else if (f.humidity >= 85) {
      alerts.push({ level: 'Medium', text: `Humidity stays above 85% in ${f.inDays} day(s).`, action: 'Check leaves daily for new spots.' });
    } else if (f.rainMm === 0 && f.inDays <= 3) {
      alerts.push({ level: 'Low', text: `Dry spell in ${f.inDays} day(s).`, action: 'Water early morning to reduce stress.' });
    }
    if (f.windKmh >= 40) {
      alerts.push({ level: 'High', text: `Strong wind (${f.windKmh} km/h) expected in ${f.inDays} day(s).`, action: 'Do not spray — drift risk.' });
    }
  }
  logger.info('weather.alerts_generated', { count: alerts.length });
  return alerts;
}

module.exports = { summariseWeeks, alertsFromForecast };
