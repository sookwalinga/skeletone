// Placeholder text of about `length` characters, in words so it wraps like real text.
export function text(length) {
  return 'xxxxx '.repeat(Math.ceil(length / 6)).slice(0, length).trimEnd()
}
