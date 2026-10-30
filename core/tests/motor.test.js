// Tests: motor safety. Author: Rishi Gullapalli (rishisfdc9-daaku)
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { canRun, waterNeedLitres, validateSchedule } = require('../motor');

test('dry-run blocks the motor', () => {
  const r = canRun({ start: '18:00', end: '21:00', minutes: 45 }, { dryRun: true, waterLevelOk: true });
  assert.equal(r.allowed, false);
  assert.match(r.reasons.join(' '), /Dry-run/);
});
test('wet soil blocks watering', () => {
  const r = canRun({ start: '18:00', end: '21:00', minutes: 45 }, { soilMoisturePct: 75 });
  assert.equal(r.allowed, false);
});
test('overnight window is valid', () => {
  const s = validateSchedule({ start: '22:00', end: '02:00', minutes: 60 });
  assert.equal(s.crossesMidnight, true);
});
test('window shorter than requested minutes is rejected', () => {
  const r = canRun({ start: '18:00', end: '18:30', minutes: 45 }, {});
  assert.equal(r.allowed, false);
});
test('normal schedule inside window is allowed', () => {
  const r = canRun({ start: '18:00', end: '21:00', minutes: 45 }, { dryRun: false, waterLevelOk: true, soilMoisturePct: 28 }, '18:30');
  assert.equal(r.allowed, true);
});
test('water estimate is capped', () => {
  assert.ok(waterNeedLitres({ soilMoisturePct: 5, cropStage: 'Flowering', plotAcres: 100 }) <= 20000);
});
