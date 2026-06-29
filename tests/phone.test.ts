import { describe, it, expect } from 'vitest'
import { phoneDigits, normalizePhone, isValidPhone } from '../src/main/server/util'

describe('phoneDigits', () => {
  it('strips non-digit characters', () => {
    expect(phoneDigits('(704) 555-1234')).toBe('7045551234')
  })

  it('drops a leading US country code on 11-digit numbers', () => {
    expect(phoneDigits('1-704-555-1234')).toBe('7045551234')
    expect(phoneDigits('+1 (704) 555-1234')).toBe('7045551234')
  })

  it('keeps an 11-digit number that does not start with 1', () => {
    expect(phoneDigits('27045551234')).toBe('27045551234')
  })

  it('returns digits as-is for a plain 10-digit number', () => {
    expect(phoneDigits('7045551234')).toBe('7045551234')
  })

  it('handles empty / null-ish input without throwing', () => {
    expect(phoneDigits('')).toBe('')
    // @ts-expect-error testing defensive handling of undefined
    expect(phoneDigits(undefined)).toBe('')
  })

  it('returns only the digits from a number with letters', () => {
    expect(phoneDigits('abc704def555ghi1234')).toBe('7045551234')
  })
})

describe('normalizePhone', () => {
  it('formats a 10-digit number as (XXX) XXX-XXXX', () => {
    expect(normalizePhone('7045551234')).toBe('(704) 555-1234')
  })

  it('formats an 11-digit leading-1 number as (XXX) XXX-XXXX', () => {
    expect(normalizePhone('17045551234')).toBe('(704) 555-1234')
    expect(normalizePhone('+1 704 555 1234')).toBe('(704) 555-1234')
  })

  it('re-formats an already messy 10-digit number', () => {
    expect(normalizePhone('704.555.1234')).toBe('(704) 555-1234')
  })

  it('passes through (trimmed) when not 10 significant digits', () => {
    expect(normalizePhone('555-1234')).toBe('555-1234')
    expect(normalizePhone('  extension 12  ')).toBe('extension 12')
  })

  it('handles empty input', () => {
    expect(normalizePhone('')).toBe('')
  })
})

describe('isValidPhone', () => {
  it('accepts a 10-digit number', () => {
    expect(isValidPhone('7045551234')).toBe(true)
    expect(isValidPhone('(704) 555-1234')).toBe(true)
  })

  it('accepts an 11-digit leading-1 number', () => {
    expect(isValidPhone('1-704-555-1234')).toBe(true)
  })

  it('rejects a number with too few digits', () => {
    expect(isValidPhone('555-1234')).toBe(false)
  })

  it('rejects a number with too many (non-1-prefixed) digits', () => {
    expect(isValidPhone('704555123456')).toBe(false)
  })

  it('rejects empty / non-numeric input', () => {
    expect(isValidPhone('')).toBe(false)
    expect(isValidPhone('not a phone')).toBe(false)
  })
})
