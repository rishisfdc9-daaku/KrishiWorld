// Tests: escalation rule. Author: Rishi Gullapalli (rishisfdc9-daaku)
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldEscalate, agronomistQueueEntry, MIN_CONFIDENCE } = require('../escalation');

test('threshold is 70', () => assert.equal(MIN_CONFIDENCE, 70));
test('confidence 69 escalates', () => assert.equal(shouldEscalate({ confidence: 69, severity: 'Low' }).escalate, true));
test('confidence 70, Medium does not escalate', () => assert.equal(shouldEscalate({ confidence: 70, severity: 'Medium' }).escalate, false));
test('High severity escalates even at 99%', () => assert.equal(shouldEscalate({ confidence: 99, severity: 'High' }).escalate, true));
test('missing confidence escalates', () => assert.equal(shouldEscalate({ confidence: null, severity: 'Low' }).escalate, true));
test('unknown severity escalates', () => assert.equal(shouldEscalate({ confidence: 90, severity: 'Weird' }).escalate, true));
test('queue entry is null when no escalation needed', () => assert.equal(agronomistQueueEntry({ issueId: 'a', crop: 'paddy', problem: 'x', confidence: 85, severity: 'Medium' }), null));
test('queue entry priority is Urgent for High severity', () => {
  const e = agronomistQueueEntry({ issueId: 'a', crop: 'paddy', problem: 'x', confidence: 90, severity: 'High' });
  assert.equal(e.priority, 'Urgent');
  assert.equal(e.status, 'Waiting for agronomist');
});
