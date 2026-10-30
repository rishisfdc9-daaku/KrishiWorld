// KrishiWorld core — crop calendar and yield planning. Author: Rishi Gullapalli (rishisfdc9-daaku)
// A calendar is only useful if it answers "what do I do this week?" —
// so each stage carries a window, a task, and a check. Yield estimates
// here are deliberately ranges, not single numbers: a single number
// ("you will get 28 quintals") is a promise I cannot keep from soil and
// weather data alone. A range with the assumptions shown is honest, and
// a farmer can plan around a range.
'use strict';
const { requireCrop, requireNumber } = require('./validation');

// Days after sowing, approximate for the pilot region. These are
// planning guides, not agronomy prescriptions — local extension advice
// for a specific variety should override them, and I say that in the UI.
const STAGES = {
  paddy: [
    { stage: 'Sowing / transplanting', dayFrom: 0, dayTo: 15, task: 'Transplant healthy seedlings; keep field flooded shallowly.' },
    { stage: 'Tillering', dayFrom: 16, dayTo: 45, task: 'Check nitrogen; watch for stem borer.' },
    { stage: 'Flowering', dayFrom: 46, dayTo: 75, task: 'Do not let the field dry out; watch for blight after rain.' },
    { stage: 'Harvest', dayFrom: 90, dayTo: 120, task: 'Drain field a week before harvest; check grain moisture.' },
  ],
  cotton: [
    { stage: 'Sowing', dayFrom: 0, dayTo: 20, task: 'Thinning and first irrigation.' },
    { stage: 'Flowering', dayFrom: 45, dayTo: 90, task: 'Watch bollworm closely; do not spray before rain.' },
    { stage: 'Harvest', dayFrom: 150, dayTo: 180, task: 'Pick in dry weather; store dry.' },
  ],
  tomato: [
    { stage: 'Transplanting', dayFrom: 0, dayTo: 15, task: 'Stake plants early; water at the root.' },
    { stage: 'Flowering / fruiting', dayFrom: 30, dayTo: 70, task: 'Watch leaf spots after rain; support heavy branches.' },
    { stage: 'Harvest', dayFrom: 70, dayTo: 110, task: 'Pick regularly; do not leave overripe fruit on the plant.' },
  ],
  maize: [
    { stage: 'Sowing', dayFrom: 0, dayTo: 15, task: 'Thin to one plant per spot.' },
    { stage: 'Flowering', dayFrom: 45, dayTo: 70, task: 'Water is critical here — a dry week at flowering costs yield.' },
    { stage: 'Harvest', dayFrom: 90, dayTo: 120, task: 'Harvest when husks dry; dry grain before storage.' },
  ],
};

function currentStage(crop, daysSinceSowing) {
  requireCrop(crop);
  const days = requireNumber(daysSinceSowing, 'daysSinceSowing', 0, 365);
  const stages = STAGES[crop];
  const found = stages.find((s) => days >= s.dayFrom && days <= s.dayTo);
  return found || { stage: 'Outside planned window', dayFrom: null, dayTo: null, task: 'Check with your agronomist — the crop is past the planned stages in this guide.' };
}

function yieldRange({ crop, acres, expectedYieldPerAcreQuintals, lossPct = 10 }) {
  // Returns a range, not a promise. lossPct defaults to 10% for pests /
  // weather, and the caller can raise it for a risky season.
  requireCrop(crop);
  const a = requireNumber(acres, 'acres', 0.05, 1000);
  const y = requireNumber(expectedYieldPerAcreQuintals, 'expectedYieldPerAcreQuintals', 0, 100);
  const loss = requireNumber(lossPct, 'lossPct', 0, 90);
  const best = Math.round(a * y);
  const worst = Math.round(best * (1 - loss / 100));
  return { bestQuintals: best, worstQuintals: worst, assumptions: `Based on ${y} quintals/acre over ${a} acres, with ${loss}% loss allowance. Not a guarantee.` };
}

module.exports = { STAGES, currentStage, yieldRange };
