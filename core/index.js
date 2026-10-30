// KrishiWorld core — public entry point. Author: Rishi Gullapalli (rishisfdc9-daaku)
// One require for the whole logic layer, so the demo, tests, and a future
// mobile app all use the same rules — especially the escalation rule.
// Run the tests with: node --test core/tests/  (from krishiworld/)
'use strict';
module.exports = {
  errors: require('./errors'),
  validation: require('./validation'),
  logger: require('./logger'),
  weather: require('./weather'),
  soil: require('./soil'),
  dealers: require('./dealers'),
  motor: require('./motor'),
  calendar: require('./calendar'),
  pest: require('./pest'),
  mandi: require('./mandi'),
  schemes: require('./schemes'),
  escalation: require('./escalation'),
  offlineQueue: require('./offline-queue'),
  privacy: require('./privacy'),
};
