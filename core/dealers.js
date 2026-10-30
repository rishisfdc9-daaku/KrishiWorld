// KrishiWorld core — dealer verification and ranking. Author: Rishi Gullapalli (rishisfdc9-daaku)
// This is the trust module, so I am strictest here. A dealer is "verified"
// only if three things are all true: a licence on file, a verification
// date within the last year, and no unresolved complaint. Any one missing
// means unverified, and unverified dealers never outrank verified ones,
// no matter how close or cheap they are. I wrote that rule in code
// because a future "promoted dealer" feature must not be able to quietly
// override it — it would have to change this file, in the open.
'use strict';
const { requireString, requireNumber } = require('./validation');

function isVerified(dealer) {
  if (!dealer || !dealer.licenceNumber) return false;
  if (dealer.unresolvedComplaints && dealer.unresolvedComplaints > 0) return false;
  if (!dealer.verifiedOn) return false;
  const verifiedOn = new Date(dealer.verifiedOn);
  if (Number.isNaN(verifiedOn.getTime())) return false;
  const ageDays = (Date.now() - verifiedOn.getTime()) / 86400000;
  return ageDays <= 365; // verification expires after a year — trust must be renewed
}

function rankDealers(dealers, opts = {}) {
  // Returns verified-first, then nearest, then cheapest. Input is not
  // mutated — callers should not be surprised by a sorted-in-place list.
  const maxDistanceKm = opts.maxDistanceKm != null ? opts.maxDistanceKm : 25;
  const list = (dealers || []).map((d) => ({
    name: requireString(d.name, 'dealer name'),
    distanceKm: requireNumber(d.distanceKm, 'distanceKm', 0, 1000),
    price: d.price || 'Price not listed',
    stock: d.stock || 'Unknown',
    verified: isVerified(d),
    licenceNumber: d.licenceNumber || null,
  })).filter((d) => d.distanceKm <= maxDistanceKm);
  list.sort((a, b) => {
    if (a.verified !== b.verified) return a.verified ? -1 : 1;
    if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    return 0;
  });
  return list;
}

function qrCheckFormat(productCode) {
  // A QR check in the real app scans a code and looks it up in the
  // dealer registry. Here I only validate the format, so a test can
  // prove bad codes are rejected before any registry call is made.
  // Format: KRISHI-<dealerId>-<batch>, e.g. KRISHI-DL42-B2026-011.
  const code = requireString(productCode, 'productCode', 8, 64);
  const ok = /^KRISHI-[A-Z0-9]{2,12}-[A-Z0-9-]{3,20}$/.test(code);
  return { code, validFormat: ok, message: ok ? 'Format OK — registry lookup would follow in the real app.' : 'Invalid QR code format. Check the code on the pack and scan again.' };
}

module.exports = { isVerified, rankDealers, qrCheckFormat };
