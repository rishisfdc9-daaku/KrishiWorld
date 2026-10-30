// KrishiWorld core — smart motor irrigation. Author: Rishi Gullapalli (rishisfdc9-daaku)
// The rule I will not bend, in code: a motor runs ONLY inside the
// electricity window the farmer gave, for at most the minutes they set,
// and it fails safe to OFF on any safety check failure. I check, in
// order: window, dry-run sensor, water level, and soil moisture (if the
// soil is already wet, watering is waste, not help). Each check returns
// a reason, because "motor did not start" without a reason is useless
// to a farmer standing in a field at 6pm.
'use strict';
const { requireTimeHHMM, toMinutes, requireNumber } = require('./validation');
const { SafetyError } = require('./errors');
const logger = require('./logger');

function validateSchedule(schedule) {
  const start = requireTimeHHMM(schedule.start, 'electricity start');
  const end = requireTimeHHMM(schedule.end, 'electricity end');
  const minutes = requireNumber(schedule.minutes, 'minutes', 5, 240);
  const startMin = toMinutes(start);
  let endMin = toMinutes(end);
  // Overnight windows (e.g. 22:00–02:00) are real in rural supply, so I
  // handle them explicitly instead of rejecting them as "end before start".
  const crossesMidnight = endMin <= startMin;
  if (crossesMidnight) endMin += 1440;
  if (endMin - startMin < minutes) {
    throw new SafetyError(`Electricity window (${start}–${end}) is shorter than the requested ${minutes} minutes.`);
  }
  return { start, end, minutes, startMin, endMin, crossesMidnight };
}

function canRun(schedule, sensors = {}, nowHHMM = null) {
  // sensors: {dryRun: bool, waterLevelOk: bool, soilMoisturePct: number}
  // Returns {allowed, reasons[]} — never throws for a safety failure,
  // because the caller needs to show the reason, not crash the page.
  const reasons = [];
  let checked;
  try { checked = validateSchedule(schedule); } catch (e) { return { allowed: false, reasons: [e.message] }; }
  if (sensors.dryRun) reasons.push('Dry-run sensor triggered — motor stays OFF to avoid pump damage.');
  if (sensors.waterLevelOk === false) reasons.push('Water level is too low — motor stays OFF.');
  if (sensors.soilMoisturePct != null && sensors.soilMoisturePct >= 60) {
    reasons.push(`Soil moisture is already ${sensors.soilMoisturePct}% — watering now would waste water.`);
  }
  if (nowHHMM) {
    let now = toMinutes(requireTimeHHMM(nowHHMM, 'current time'));
    if (checked.crossesMidnight && now < checked.startMin) now += 1440;
    if (now < checked.startMin || now + checked.minutes > checked.endMin) {
      reasons.push(`Requested run does not fit inside the electricity window ${checked.start}–${checked.end}.`);
    }
  }
  const allowed = reasons.length === 0;
  logger.info('motor.can_run_checked', { allowed, reasons: reasons.length });
  return { allowed, reasons };
}

function waterNeedLitres({ soilMoisturePct, cropStage, plotAcres = 1 }) {
  // Visible, simple estimate — drier soil + flowering crop = more water.
  // I keep this formula in one place so a reviewer can challenge it, and
  // I cap it, because an uncapped estimate once told a demo farmer to
  // use 40,000 litres for a kitchen garden. Caps are a safety feature.
  const moisture = requireNumber(soilMoisturePct, 'soilMoisturePct', 0, 100);
  const acres = requireNumber(plotAcres, 'plotAcres', 0.05, 100);
  const stageFactor = cropStage === 'Flowering' ? 1.3 : cropStage === 'Fruiting' ? 1.2 : 1.0;
  const dryness = Math.max(0, 60 - moisture);
  const litres = Math.round(dryness * 12 * stageFactor * acres);
  return Math.min(litres, 20000);
}

module.exports = { validateSchedule, canRun, waterNeedLitres };
