// KrishiWorld — demo data
// Author: Rishi Gullapalli (rishisfdc9-daaku)
//
// I am mocking this on purpose for the demo. A farmer should be able to
// click through the whole story — photo, weather, answer, dealer, motor —
// without me needing a weather API key or a real model first. When I wire
// the real services in, this file is the first thing I will replace, one
// section at a time, so I can see exactly what breaks.
// Demo dosages are illustrative only — a real agronomist must check them.

const MOCK = {
  // Demo farm used when the farmer does not share a location.
  demoFarm: {
    name: 'Demo Farm — Andhra Pradesh, India',
    latitude: 16.3067,
    longitude: 80.4365,
    village: 'Demo Village',
    soilType: 'Black cotton soil',
    soilMoisturePercent: 28,
    cropStage: 'Flowering',
  },

  // One demo diagnosis per crop. The demo always labels this as MOCK.
  // A real version would return a model result with a real confidence score.
  diagnoses: {
    paddy: {
      problem: 'Bacterial leaf blight (mock)',
      confidence: 82,
      severity: 'Medium',
      why: 'Yellowing leaf edges plus high humidity in the last 2 weeks match this pattern in the demo data.',
    },
    cotton: {
      problem: 'Pink bollworm damage (mock)',
      confidence: 76,
      severity: 'Medium',
      why: 'Boll damage plus warm, humid nights in the last 3 weeks match this pattern in the demo data.',
    },
    tomato: {
      problem: 'Early blight — leaf spots (mock)',
      confidence: 84,
      severity: 'Medium',
      why: 'Dark leaf spots plus recent rain and humidity match this pattern in the demo data.',
    },
    maize: {
      problem: 'Nitrogen deficiency (mock)',
      confidence: 71,
      severity: 'Low',
      why: 'Pale lower leaves plus low soil nitrogen in the demo soil data match this pattern.',
    },
  },

  // Past 3 weeks, summarised by week. A real version would show daily data.
  weatherWeeks: [
    { label: '3 weeks ago', rainMm: 42, avgTempC: 31, humidity: 72, note: 'Two heavy showers.' },
    { label: '2 weeks ago', rainMm: 18, avgTempC: 33, humidity: 68, note: 'Hot and humid nights.' },
    { label: 'Last week', rainMm: 61, avgTempC: 30, humidity: 81, note: 'Wet week — disease risk rose.' },
  ],
  forecast: 'Light rain expected in 2 days, then dry and hot for 4 days.',

  // Resolution steps shown after a mock diagnosis.
  // IMPORTANT: dosages below are illustrative demo text, not agronomist advice.
  resolution: [
    'Remove badly affected leaves and keep them away from healthy plants.',
    'Spray only in the early morning or late evening — never in strong sun or just before rain.',
    'Demo dosage (illustrative only): follow your local agronomist’s label dose for this crop — do not copy a demo dose onto a real field.',
    'Wear gloves and a mask while spraying, wash hands after, and keep children and animals away until the spray dries.',
    'Check the same plants again in 3 days and take a new photo if spots spread.',
  ],

  // Verified dealers are mock entries. Ranking: verified first, then distance.
  dealers: [
    { name: 'Sri Lakshmi Agro Centre', distanceKm: 2.4, product: 'Copper-based fungicide (demo)', price: '₹420 / pack', stock: 'In stock', verified: true },
    { name: 'Rythu Seva Kendra', distanceKm: 4.1, product: 'Balanced NPK fertiliser (demo)', price: '₹385 / bag', stock: 'In stock', verified: true },
    { name: 'Village Agro Traders', distanceKm: 6.8, product: 'Neem oil spray (demo)', price: '₹260 / bottle', stock: 'Low stock', verified: true },
  ],

  alerts: [
    { level: 'High', text: 'Heavy rain in 2 days — do not spray tomorrow. Cover harvested produce.', action: 'Delay spraying' },
    { level: 'Medium', text: 'Humidity stays above 80% — check leaves daily for new spots.', action: 'Daily leaf check' },
    { level: 'Low', text: 'Hot spell after the rain — water early morning to reduce stress.', action: 'Water early morning' },
  ],
};
