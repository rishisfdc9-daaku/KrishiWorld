// KrishiWorld core — errors. Author: Rishi Gullapalli (rishisfdc9-daaku)
// Why typed errors instead of plain strings: when a motor schedule fails
// or a dealer check fails, the UI needs to know whether to retry, ask
// the farmer for input, or escalate — and a string cannot carry that.
// Every module in core/ throws one of these, never a bare Error, so the
// caller can decide without parsing messages.
'use strict';

class KrishiError extends Error {
  constructor(code, message, opts = {}) {
    super(message);
    this.name = 'KrishiError';
    this.code = code; // e.g. 'VALIDATION', 'NETWORK', 'SAFETY', 'NOT_FOUND'
    this.retryable = !!opts.retryable;
    this.field = opts.field || null;
  }
}

class ValidationError extends KrishiError {
  constructor(field, message) {
    super('VALIDATION', message, { field });
    this.name = 'ValidationError';
  }
}

class SafetyError extends KrishiError {
  // Safety errors are NEVER retryable automatically. A motor that failed
  // a dry-run check must stay off until a human looks at it.
  constructor(message) { super('SAFETY', message, { retryable: false }); this.name = 'SafetyError'; }
}

class NetworkError extends KrishiError {
  constructor(message) { super('NETWORK', message, { retryable: true }); this.name = 'NetworkError'; }
}

module.exports = { KrishiError, ValidationError, SafetyError, NetworkError };
