// KrishiWorld core — offline queue. Author: Rishi Gullapalli (rishisfdc9-daaku)
// Offline is not an edge case for farmers, it is the normal case. So a
// case created offline must survive a closed app, a dead battery, and a
// week without signal. This queue is in-memory for the demo, but its
// rules are the ones a real local store must follow: every item has an
// id, a created timestamp, a retry count, and a last-error; retries use
// backoff (not a tight loop that drains battery); and conflicts are
// resolved by timestamp — the newest farmer note wins, but the older
// note is kept in the log, never silently overwritten.
'use strict';
const logger = require('./logger');

function createQueue() {
  let items = [];
  let seq = 0;
  return {
    enqueue(type, payload) {
      const item = {
        id: `q-${Date.now()}-${++seq}`,
        type, payload,
        createdAt: new Date().toISOString(),
        attempts: 0, status: 'pending', lastError: null,
      };
      items.push(item);
      logger.info('offline.enqueued', { id: item.id, type });
      return item;
    },
    pending() { return items.filter((i) => i.status === 'pending' || i.status === 'failed'); },
    markSent(id) {
      const item = items.find((i) => i.id === id);
      if (item) { item.status = 'sent'; logger.info('offline.sent', { id }); }
      return item;
    },
    markFailed(id, error) {
      const item = items.find((i) => i.id === id);
      if (!item) return null;
      item.attempts += 1;
      item.lastError = String(error && error.message ? error.message : error);
      // Give up after 5 attempts — a permanently failing item should be
      // shown to the farmer, not retried forever in the background.
      item.status = item.attempts >= 5 ? 'dead' : 'failed';
      logger.warn('offline.failed', { id, attempts: item.attempts, status: item.status });
      return item;
    },
    // Backoff in ms: 5s, 15s, 45s, 2min, 5min. I cap it so a farmer who
    // comes back into signal after an hour does not wait another hour.
    backoffMs(attempts) {
      return Math.min(300000, 5000 * Math.pow(3, Math.max(0, attempts - 1)));
    },
    // Conflict rule, stated plainly so it can be tested: newest wins,
    // but the loser is returned for the audit log, not discarded.
    resolveConflict(local, remote) {
      const localTime = new Date(local.updatedAt).getTime();
      const remoteTime = new Date(remote.updatedAt).getTime();
      if (Number.isNaN(localTime) || Number.isNaN(remoteTime)) {
        return { winner: local, loser: remote, reason: 'Unparseable timestamp — kept the local note to be safe.' };
      }
      return localTime >= remoteTime
        ? { winner: local, loser: remote, reason: 'Local note is newer.' }
        : { winner: remote, loser: local, reason: 'Server note is newer.' };
    },
    clearSent() { items = items.filter((i) => i.status !== 'sent'); },
  };
}

module.exports = { createQueue };
