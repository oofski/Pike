import { describe, it, expect } from 'vitest'
import { toCsvExportUrl, SheetUrlError } from '../src/main/server/services/sheets'

const ID = '1AbCdEf_-Gh23ijKLmnopQRsTuvWxyz0123456789'

describe('toCsvExportUrl', () => {
  it('converts an /edit#gid=N share link into the CSV export form', () => {
    const out = toCsvExportUrl(`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=7`)
    expect(out).toBe(`https://docs.google.com/spreadsheets/d/${ID}/export?format=csv&gid=7`)
  })

  it('reads gid from the query string (?gid=N)', () => {
    const out = toCsvExportUrl(`https://docs.google.com/spreadsheets/d/${ID}/edit?gid=42`)
    expect(out).toBe(`https://docs.google.com/spreadsheets/d/${ID}/export?format=csv&gid=42`)
  })

  it('defaults gid to 0 when none is present (e.g. ?usp=sharing)', () => {
    const out = toCsvExportUrl(`https://docs.google.com/spreadsheets/d/${ID}/edit?usp=sharing`)
    expect(out).toBe(`https://docs.google.com/spreadsheets/d/${ID}/export?format=csv&gid=0`)
  })

  it('defaults gid to 0 for a bare /d/<ID> link', () => {
    const out = toCsvExportUrl(`https://docs.google.com/spreadsheets/d/${ID}`)
    expect(out).toBe(`https://docs.google.com/spreadsheets/d/${ID}/export?format=csv&gid=0`)
  })

  it('rejects a non-http(s) URL (e.g. ftp / file / javascript)', () => {
    expect(() => toCsvExportUrl('ftp://docs.google.com/spreadsheets/d/' + ID)).toThrow(SheetUrlError)
    expect(() => toCsvExportUrl('file:///etc/passwd')).toThrow(SheetUrlError)
  })

  it('rejects an empty / non-string URL', () => {
    expect(() => toCsvExportUrl('')).toThrow(SheetUrlError)
    expect(() => toCsvExportUrl('   ')).toThrow(SheetUrlError)
    expect(() => toCsvExportUrl(undefined)).toThrow(SheetUrlError)
  })

  it('rejects a syntactically invalid URL', () => {
    expect(() => toCsvExportUrl('not a url at all')).toThrow(SheetUrlError)
  })

  it('rejects a valid URL that is not a Google Sheets link', () => {
    expect(() => toCsvExportUrl('https://example.com/foo/bar')).toThrow(SheetUrlError)
  })
})
