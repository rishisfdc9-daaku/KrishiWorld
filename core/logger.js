// KrishiWorld core — logger. Author: Rishi Gullapalli (rishisfdc9-daaku)
// Why a logger in a demo library: when a farmer says "the motor did not
// run", I need an answer that is not "it worked on my phone". Every
// decision in core/ logs a structured event with a timestamp, and the
// log is kept in memory (never auto-uploaded — see privacy.js). In the
// real app this would sync with the case record; here it is the audit
// trail a reviewer can read in tests.
'use strict';

const entries = [];
const LEVELS = ['debug', 'info', 'warn', 'error'];

function log(level, event, detail = {}) {
  if (!LEVELS.includes(level)) level = 'info';
  const entry = { at: new Date().toISOString(), level, event, detail };
  entries.push(entry);
  if (entries.length > 1000) entries.splice(0, entries.length - 1000);
  return entry;
}

function getEntries(level) {
  return level ? entries.filter((e) => e.level === level) : [...entries];
}
function clear() { entries.length = 0; }

module.exports = {
  debug: (e, d) => log('debug', e, d),
  info: (e, d) => log('info', e, d),
  warn: (e, d) => log('warn', e, d),
  error: (e, d) => log('error', e, d),
  getEntries, clear,
};
