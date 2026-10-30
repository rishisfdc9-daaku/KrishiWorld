// KrishiWorld core — pest outbreak warnings. Author: Rishi Gullapalli (rishisfdc9-daaku)
// Outbreak warnings only work if farmers report honestly, and they only
// report honestly if reporting cannot hurt them. So this module works on
// anonymised, village-level counts only: it never needs a farmer's name,
// and it never returns one. The trade-off is real — I cannot warn "your
// neighbour's field has bollworm" — but the village-level warning
// ("3 reports in your village this week") is enough to trigger a check,
// and it is the warning I am comfortable sending.
'use strict';
const { requireNumber } = require('./validation');

function outbreakLevel({ reportsInVillageThisWeek, villageFarmCount, pest }) {
  // reports: confirmed or agronomist-flagged reports, not raw guesses.
  // I use a rate, not a raw count, because 3 reports in a 10-farm village
  // means something very different from 3 in a 500-farm village.
  const reports = requireNumber(reportsInVillageThisWeek, 'reportsInVillageThisWeek', 0, 10000);
  const farms = requireNumber(villageFarmCount, 'villageFarmCount', 1, 100000);
  const rate = reports / farms;
  const level = rate >= 0.1 ? 'High' : rate >= 0.03 ? 'Medium' : reports > 0 ? 'Low' : 'None';
  const message = level === 'None'
    ? `No ${pest} reports in your village this week.`
    : `${pest} reported by ${reports} farm(s) in your village this week (${(rate * 100).toFixed(1)}% of farms). Check your crop today.`;
  return {
    pest, level, reports, rate: Math.round(rate * 1000) / 1000,
    action: level === 'High' ? 'Inspect daily and contact your agronomist today.'
      : level === 'Medium' ? 'Inspect every 2 days; share a photo if you see damage.'
      : level === 'Low' ? 'Keep an eye out during your normal rounds.'
      : 'No action needed.',
    message,
    // Privacy note, attached to every result so a UI cannot accidentally
    // strip it: this is village-level, anonymised data.
    privacy: 'Village-level counts only. No individual farm or farmer is identified.',
  };
}

module.exports = { outbreakLevel };
