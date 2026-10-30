// Tests: dealers, weather, soil, pest, mandi, privacy, offline queue.
// Author: Rishi Gullapalli (rishisfdc9-daaku)
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { isVerified, rankDealers, qrCheckFormat } = require('../dealers');
const { summariseWeeks, alertsFromForecast } = require('../weather');
const { assessSoil } = require('../soil');
const { outbreakLevel } = require('../pest');
const { priceTrend, latestPrice } = require('../mandi');
const { anonymiseLocation, stripPersonalFields, consentCheck } = require('../privacy');
const { createQueue } = require('../offline-queue');
const { currentStage, yieldRange } = require('../calendar');
const { matchSchemes, insuranceClaimChecklist } = require('../schemes');

const recent = new Date().toISOString().slice(0, 10);

test('unverified dealer never outranks verified, even if nearer', () => {
  const ranked = rankDealers([
    { name: 'Near Unverified', distanceKm: 1, verifiedOn: null, licenceNumber: null },
    { name: 'Far Verified', distanceKm: 9, verifiedOn: recent, licenceNumber: 'LIC-1' },
  ]);
  assert.equal(ranked[0].name, 'Far Verified');
});
test('expired verification (over a year) is not verified', () => {
  assert.equal(isVerified({ licenceNumber: 'L1', verifiedOn: '2020-01-01' }), false);
});
test('QR format validation', () => {
  assert.equal(qrCheckFormat('KRISHI-DL42-B2026-011').validFormat, true);
  assert.equal(qrCheckFormat('random-code').validFormat, false);
});
test('weather summary and disease risk', () => {
  const s = summariseWeeks(Array.from({ length: 21 }, () => ({ rainMm: 10, tempC: 30, humidity: 85 })));
  assert.equal(s.diseaseRisk, 'High');
  assert.equal(s.totalRainMm, 210);
});
test('weather: empty input throws, not NaN', () => assert.throws(() => summariseWeeks([])));
test('forecast: heavy rain gives one clear action', () => {
  const a = alertsFromForecast([{ inDays: 2, rainMm: 30, humidity: 80, windKmh: 10 }]);
  assert.equal(a[0].level, 'High');
  assert.match(a[0].action, /Do not spray/);
});
test('soil: low nitrogen is flagged, not dosed', () => {
  const r = assessSoil({ ph: 6.5, organicCarbonPct: 0.6, nitrogenKgHa: 150, phosphorusKgHa: 20, potassiumKgHa: 200 });
  assert.ok(r.low.includes('nitrogen'));
  assert.ok(r.recommendations.join(' ').includes('agronomist'));
});
test('pest: rate, not raw count, drives level', () => {
  assert.equal(outbreakLevel({ reportsInVillageThisWeek: 3, villageFarmCount: 10, pest: 'bollworm' }).level, 'High');
  assert.equal(outbreakLevel({ reportsInVillageThisWeek: 3, villageFarmCount: 500, pest: 'bollworm' }).level, 'Low');
  assert.ok(!outbreakLevel({ reportsInVillageThisWeek: 3, villageFarmCount: 10, pest: 'bollworm' }).message.includes('Rishi'));
});
test('mandi: stale price is labelled stale', () => {
  const p = latestPrice([{ date: '2020-01-01', pricePerQuintal: 2000 }], 'Test Mandi');
  assert.equal(p.stale, true);
  assert.equal(priceTrend([{ date: '2026-01-01', pricePerQuintal: 1000 }, { date: '2026-01-02', pricePerQuintal: 1200 }]).trend, 'Rising');
});
test('privacy: personal fields stripped, consent defaults to no', () => {
  assert.equal(stripPersonalFields({ name: 'X', phone: '9', crop: 'paddy' }).phone, undefined);
  assert.equal(consentCheck({}, 'location').allowed, false);
  assert.deepEqual(anonymiseLocation(16.3067, 80.4365), { lat: 16.31, lon: 80.44, precision: 'village (~1 km)' });
});
test('offline queue: dead after 5 attempts, backoff capped', () => {
  const q = createQueue();
  const item = q.enqueue('case', { crop: 'paddy' });
  let last;
  for (let i = 0; i < 5; i++) last = q.markFailed(item.id, new Error('no signal'));
  // Dead items leave the pending list — they must be shown to the
  // farmer, not retried forever in the background.
  assert.equal(last.status, 'dead');
  assert.equal(q.pending().length, 0);
  assert.ok(q.backoffMs(99) <= 300000);
  const conflict = q.resolveConflict({ updatedAt: '2026-01-02T00:00:00Z' }, { updatedAt: '2026-01-01T00:00:00Z' });
  assert.equal(conflict.reason, 'Local note is newer.');
});
test('calendar and yield: range, not a promise', () => {
  assert.equal(currentStage('paddy', 50).stage, 'Flowering');
  const y = yieldRange({ crop: 'paddy', acres: 2, expectedYieldPerAcreQuintals: 25, lossPct: 10 });
  assert.equal(y.bestQuintals, 50);
  assert.equal(y.worstQuintals, 45);
  assert.match(y.assumptions, /Not a guarantee/);
});
test('schemes: matches rules, never claims outright eligibility', () => {
  const m = matchSchemes({ crop: 'paddy', acres: 1 });
  assert.ok(m.length > 0);
  assert.match(m[0].status, /verify on the official portal/);
  assert.equal(insuranceClaimChecklist({ photoTaken: true, lossReportedWithinDays: 10, cropStage: 'Flowering' }).readyToFile, true);
});
