// Placeholder text of about `length` characters, in words so it wraps like real text.
export function text(length) {
  return 'xxxxx '.repeat(Math.ceil(Math.max(length, 0) / 6)).slice(0, length).trimEnd()
}
