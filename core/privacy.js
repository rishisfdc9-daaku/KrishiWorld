// KrishiWorld core — farmer data privacy. Author: Rishi Gullapalli (rishisfdc9-daaku)
// The farmer owns their data. That is not a slogan in this file, it is
// three concrete rules: (1) location is used only with explicit consent
// and only at village precision for any shared warning; (2) phone numbers
// and names are never included in shared/pest-warning payloads; (3) a
// farmer can export or delete their local data. If a future feature
// cannot satisfy all three, it does not ship — I would rather lose a
// feature than lose a farmer's trust, and trust is the only reason a
// farmer would let an app photograph their crop in the first place.
'use strict';

function anonymiseLocation(lat, lon) {
  // Village precision: round to ~1 km (2 decimal places). Enough to warn
  // a village, not enough to point at a single field.
  if (lat == null || lon == null) return null;
  return { lat: Math.round(Number(lat) * 100) / 100, lon: Math.round(Number(lon) * 100) / 100, precision: 'village (~1 km)' };
}

function stripPersonalFields(record) {
  // Remove anything that identifies a person from a shared payload.
  // I list fields explicitly (allowlist approach would be safer in a
  // real system, but for this library the denylist is documented and
  // tested — and a reviewer can see exactly what is stripped).
  const banned = ['name', 'phone', 'phoneNumber', 'email', 'aadhaar', 'address', 'farmerName'];
  const out = {};
  for (const [key, value] of Object.entries(record || {})) {
    if (!banned.includes(key)) out[key] = value;
  }
  return out;
}

function consentCheck(consents, purpose) {
  // consents: {location: bool, photos: bool, alerts: bool}
  // A missing consent is a "no". I never default to yes for data use.
  if (!consents || consents[purpose] !== true) {
    return { allowed: false, reason: `Consent for "${purpose}" was not given. Ask the farmer first.` };
  }
  return { allowed: true, reason: 'Consent recorded.' };
}

module.exports = { anonymiseLocation, stripPersonalFields, consentCheck };
