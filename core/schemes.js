// KrishiWorld core — government schemes and insurance. Author: Rishi Gullapalli (rishisfdc9-daaku)
// Schemes change every year, and the worst thing this module could do is
// tell a farmer "you are eligible" for a scheme that closed last month.
// So eligibility here is always conditional: it matches a farmer's facts
// against a scheme's stated rules, and it always returns the scheme's
// source and last-checked date, so the farmer (or an agronomist) can
// verify before applying. Rules are data, not code — adding a scheme
// means adding a record, not editing this file's logic.
'use strict';

// Example records only — replace with current official rules before use.
// I keep these generic on purpose: inventing a scheme's exact benefit
// amount would be worse than showing no scheme at all.
const SCHEMES = [
  {
    id: 'crop-insurance',
    name: 'Crop insurance (PMFBY-style)',
    appliesTo: ['paddy', 'cotton', 'tomato', 'maize'],
    requires: { minAcres: 0.1 },
    summary: 'Insures notified crops against yield loss. Enrolment windows and premium shares vary by season — check the current notification.',
    source: 'Official scheme portal / local agriculture office',
  },
  {
    id: 'soil-health-card',
    name: 'Soil Health Card',
    appliesTo: ['paddy', 'cotton', 'tomato', 'maize'],
    requires: { minAcres: 0 },
    summary: 'Free soil testing and a health card with nutrient recommendations, once per cycle.',
    source: 'Soil Health Card portal / local agriculture office',
  },
];

function matchSchemes({ crop, acres, lastChecked = null }) {
  const matched = SCHEMES.filter((s) => s.appliesTo.includes(crop) && acres >= (s.requires.minAcres || 0));
  return matched.map((s) => ({
    ...s,
    // I never say "eligible" outright — I say "matches the stated rules
    // on the data you gave". The final check is always the official portal.
    status: 'Matches stated rules — verify on the official portal before applying',
    lastChecked: lastChecked || 'Not checked yet — verify dates before applying',
  }));
}

function insuranceClaimChecklist({ photoTaken, lossReportedWithinDays, cropStage }) {
  // Photo evidence + timely reporting are the two things farmers most
  // often miss for a claim. This checklist exists so the app reminds
  // them at the right moment, not after the window closes.
  const items = [
    { item: 'Crop photo taken at the time of damage', done: !!photoTaken },
    { item: 'Loss reported within the scheme window', done: lossReportedWithinDays != null && lossReportedWithinDays <= 72 },
    { item: 'Crop stage recorded', done: !!cropStage },
  ];
  const missing = items.filter((i) => !i.done).map((i) => i.item);
  return { items, readyToFile: missing.length === 0, missing };
}

module.exports = { SCHEMES, matchSchemes, insuranceClaimChecklist };
