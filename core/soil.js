// KrishiWorld core — soil health. Author: Rishi Gullapalli (rishisfdc9-daaku)
// Soil Health Cards in India already give pH, organic carbon, N, P, K.
// My job here is not to replace that card, it is to turn it into plain
// language: what is low, what is fine, and what to do about it. I score
// each nutrient 0-100 against agronomy ranges I can defend, and I never
// recommend a dose from this score alone — the score says "check this",
// the agronomist's label dose says how much. That separation matters:
// a score is not a prescription.
'use strict';
const { requireNumber } = require('./validation');

// Ranges are broad, published-style bands for Indian soils. If a state
// extension service gives tighter ranges for a crop, those should replace
// these — I would rather be honest about "broad bands" than invent precision.
const BANDS = {
  ph: { low: 5.5, high: 7.5, score: (v) => (v >= 5.5 && v <= 7.5 ? 100 : v < 5.5 ? Math.max(20, 100 - (5.5 - v) * 40) : Math.max(20, 100 - (v - 7.5) * 40)) },
  organicCarbonPct: { low: 0.5, high: 0.75 },
  nitrogenKgHa: { low: 280, high: 560 },
  phosphorusKgHa: { low: 10, high: 25 },
  potassiumKgHa: { low: 110, high: 280 },
};

function scoreBand(value, low, high) {
  if (value < low) return Math.max(10, Math.round((value / low) * 60));
  if (value > high) return 85; // excess is not ideal, but it is not a deficiency
  return 100;
}

function assessSoil(card) {
  // card: {ph, organicCarbonPct, nitrogenKgHa, phosphorusKgHa, potassiumKgHa}
  const ph = requireNumber(card.ph, 'ph', 3, 11);
  const oc = requireNumber(card.organicCarbonPct, 'organicCarbonPct', 0, 5);
  const n = requireNumber(card.nitrogenKgHa, 'nitrogenKgHa', 0, 2000);
  const p = requireNumber(card.phosphorusKgHa, 'phosphorusKgHa', 0, 500);
  const k = requireNumber(card.potassiumKgHa, 'potassiumKgHa', 0, 2000);
  const scores = {
    ph: Math.round(BANDS.ph.score(ph)),
    organicCarbon: scoreBand(oc, 0.5, 0.75),
    nitrogen: scoreBand(n, 280, 560),
    phosphorus: scoreBand(p, 10, 25),
    potassium: scoreBand(k, 110, 280),
  };
  const overall = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 5);
  const low = Object.entries(scores).filter(([, s]) => s < 60).map(([key]) => key);
  const recommendations = [];
  if (low.includes('nitrogen')) recommendations.push('Nitrogen is low — discuss a nitrogen plan with your agronomist; do not guess the dose from this score.');
  if (low.includes('organicCarbon')) recommendations.push('Organic carbon is low — compost / farmyard manure over time improves it more than a one-season chemical fix.');
  if (scores.ph < 60) recommendations.push(ph < 5.5 ? 'Soil is acidic — lime may help, but only on agronomist advice for your crop.' : 'Soil is alkaline — check water quality too, it often explains this.');
  if (low.length === 0) recommendations.push('Soil nutrients look balanced on this card — keep the current practice and retest next season.');
  return { scores, overall, health: overall >= 80 ? 'Good' : overall >= 60 ? 'Fair' : 'Needs attention', low, recommendations };
}

module.exports = { assessSoil, BANDS };
