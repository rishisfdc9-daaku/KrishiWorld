// KrishiWorld core — validation. Author: Rishi Gullapalli (rishisfdc9-daaku)
// I validate at the boundary, once, so every module below can trust its
// inputs. The alternative — each module checking the same things in its
// own way — is how a bad latitude or a negative dosage slips through.
// Rules here are deliberately strict: a farmer's field data is not the
// place to be generous with bad input.
'use strict';
const { ValidationError } = require('./errors');

function requireString(value, field, min = 1, max = 500) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) {
    throw new ValidationError(field, `${field} must be ${min}-${max} characters.`);
  }
  return value.trim();
}

function requireNumber(value, field, min = -Infinity, max = Infinity) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new ValidationError(field, `${field} must be a number between ${min} and ${max}.`);
  }
  return n;
}

function requireLatLon(lat, lon) {
  // India is roughly lat 8-37, lon 68-97, but I validate the global range
  // here and let the caller narrow it — core should not assume a farmer
  // can never be outside India, even if the pilot is.
  return {
    lat: requireNumber(lat, 'latitude', -90, 90),
    lon: requireNumber(lon, 'longitude', -180, 180),
  };
}

function requireCrop(crop) {
  const allowed = ['paddy', 'cotton', 'tomato', 'maize'];
  if (!allowed.includes(crop)) {
    throw new ValidationError('crop', `Crop must be one of: ${allowed.join(', ')}. Got "${crop}".`);
  }
  return crop;
}

function requireTimeHHMM(value, field) {
  if (!/^\d{2}:\d{2}$/.test(String(value || ''))) {
    throw new ValidationError(field, `${field} must be HH:MM, e.g. "18:00".`);
  }
  const [h, m] = String(value).split(':').map(Number);
  if (h > 23 || m > 59) throw new ValidationError(field, `${field} is not a real time.`);
  return String(value);
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

module.exports = { requireString, requireNumber, requireLatLon, requireCrop, requireTimeHHMM, toMinutes };
