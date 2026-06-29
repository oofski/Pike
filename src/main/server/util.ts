/** Server-side helpers shared across routes. */

/** Reduce a phone string to its significant digits (drops US country code). */
export function phoneDigits(input: string): string {
  let d = (input || '').replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1)
  return d
}

/** Canonical stored format: (XXX) XXX-XXXX when 10 digits, else trimmed input. */
export function normalizePhone(input: string): string {
  const d = phoneDigits(input)
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  return (input || '').trim()
}

export function isValidPhone(input: string): boolean {
  return phoneDigits(input).length === 10
}
