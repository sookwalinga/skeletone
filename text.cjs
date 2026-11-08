'use strict'
// CommonJS copy of text.mjs, for require() and Jest. Keep the two in step.

// Placeholder text of about `length` characters, in words so it wraps like real text.
exports.text = function text(length) {
  return 'xxxxx '.repeat(Math.ceil(length / 6)).slice(0, length).trimEnd()
}
