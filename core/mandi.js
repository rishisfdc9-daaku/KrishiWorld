// KrishiWorld core — mandi prices. Author: Rishi Gullapalli (rishisfdc9-daaku)
// Prices are the easiest thing in this project to get wrong and the
// hardest to undo: a farmer who sells on a stale price loses real money.
// So every price here carries its date and mandi, and I refuse to show a
// price older than 7 days as "current" — it is labelled stale, with the
// date shown. I also show trend as a percentage, not just "up/down",
// because "up ₹20" means nothing without knowing whether the base was
// ₹200 or ₹2,000.
'use strict';
const { requireNumber } = require('./validation');

function priceTrend(prices) {
  // prices: [{date: 'YYYY-MM-DD', pricePerQuintal}] sorted oldest-first.
  if (!Array.isArray(prices) || prices.length < 2) {
    return { trend: 'Unknown', changePct: null, message: 'Need at least 2 dated prices to show a trend.' };
  }
  const first = requireNumber(prices[0].pricePerQuintal, 'pricePerQuintal', 0, 100000);
  const last = requireNumber(prices[prices.length - 1].pricePerQuintal, 'pricePerQuintal', 0, 100000);
  const changePct = first === 0 ? null : Math.round(((last - first) / first) * 1000) / 10;
  return {
    trend: changePct === null ? 'Unknown' : changePct > 2 ? 'Rising' : changePct < -2 ? 'Falling' : 'Stable',
    changePct,
    first, last,
    message: changePct === null ? 'Trend unknown.' : `Price moved ${changePct}% from ₹${first} to ₹${last} per quintal over the shown period.`,
  };
}

function latestPrice(prices, mandi) {
  if (!Array.isArray(prices) || prices.length === 0) return null;
  const sorted = [...prices].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const latest = sorted[0];
  const ageDays = Math.floor((Date.now() - new Date(latest.date).getTime()) / 86400000);
  return {
    mandi: mandi || latest.mandi || 'Unknown mandi',
    date: latest.date,
    pricePerQuintal: latest.pricePerQuintal,
    stale: ageDays > 7,
    note: ageDays > 7
      ? `STALE: this price is ${ageDays} days old. Check the mandi before selling on it.`
      : 'Current (within 7 days). Still confirm at the mandi gate before transport.',
  };
}

module.exports = { priceTrend, latestPrice };
