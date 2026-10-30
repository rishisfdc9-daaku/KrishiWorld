// KrishiWorld core — agronomist escalation. Author: Rishi Gullapalli (rishisfdc9-daaku)
// One rule, in one place, used by the demo, the AI service, and Apex:
// confidence < 70 OR severity = High => escalate. I duplicated this rule
// in three places in early drafts and they drifted within a week —
// 70 in one, 75 in another. That drift is exactly how a low-confidence
// case gets answered by a bot instead of a human. So this module is the
// canonical rule, and the other layers are supposed to import or mirror
// it and be tested against it (see core/tests/).
'use strict';
const MIN_CONFIDENCE = 70;

function shouldEscalate({ confidence, severity }) {
  const conf = confidence == null ? 0 : Number(confidence);
  // Null confidence is treated as 0: no score, no automatic answer.
  if (!Number.isFinite(conf) || conf < MIN_CONFIDENCE) {
    return { escalate: true, reason: `Confidence ${Number.isFinite(conf) ? conf : 'missing'}% is below ${MIN_CONFIDENCE}%.` };
  }
  if (severity === 'High') {
    return { escalate: true, reason: 'Severity is High — a human must review, regardless of confidence.' };
  }
  if (!['Low', 'Medium', 'High'].includes(severity)) {
    return { escalate: true, reason: `Unknown severity "${severity}" — escalate rather than assume it is safe.` };
  }
  return { escalate: false, reason: 'Confidence and severity are within the automatic-answer range.' };
}

function agronomistQueueEntry({ issueId, crop, problem, confidence, severity, reason }) {
  const decision = shouldEscalate({ confidence, severity });
  if (!decision.escalate) return null;
  return {
    issueId, crop, problem, confidence, severity,
    queuedAt: new Date().toISOString(),
    priority: severity === 'High' ? 'Urgent' : 'Standard',
    reason: decision.reason,
    status: 'Waiting for agronomist',
  };
}

module.exports = { MIN_CONFIDENCE, shouldEscalate, agronomistQueueEntry };
