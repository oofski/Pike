/**
 * Google Sheets import helpers.
 *
 * Converts a Google Sheets share/edit URL into its CSV-export form and
 * fetches the CSV server-side (renderer cannot fetch docs.google.com directly
 * because of CORS / cookies). Used by POST /api/pnms/import-sheet.
 */

/** Thrown for client errors (bad URL) → maps to HTTP 400. */
export class SheetUrlError extends Error {}

/** Thrown when the upstream fetch fails or returns non-2xx → maps to HTTP 502. */
export class SheetFetchError extends Error {}

/**
 * Convert a Google Sheets share/edit URL to its CSV export URL.
 *
 * Examples it accepts:
 *   https://docs.google.com/spreadsheets/d/<ID>/edit#gid=<GID>
 *   https://docs.google.com/spreadsheets/d/<ID>/edit?usp=sharing
 *   https://docs.google.com/spreadsheets/d/<ID>/edit?gid=<GID>#gid=<GID>
 *   https://docs.google.com/spreadsheets/d/<ID>
 *   …/export?format=csv&gid=<GID>  (already-export form is passed through)
 *
 * Produces:
 *   https://docs.google.com/spreadsheets/d/<ID>/export?format=csv&gid=<GID>
 *
 * Defaults gid to 0 when none is present.
 */
export function toCsvExportUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    throw new SheetUrlError('A Google Sheets URL is required')
  }
  const input = rawUrl.trim()

  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new SheetUrlError('Invalid URL')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SheetUrlError('URL must start with http:// or https://')
  }

  // Extract the spreadsheet ID from /spreadsheets/d/<ID>/...
  const idMatch = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!idMatch) {
    throw new SheetUrlError('That does not look like a Google Sheets URL')
  }
  const id = idMatch[1]

  // gid may live in the query (?gid=123) or the fragment (#gid=123).
  let gid = url.searchParams.get('gid')
  if (!gid && url.hash) {
    const hashMatch = url.hash.match(/gid=([0-9]+)/)
    if (hashMatch) gid = hashMatch[1]
  }
  if (!gid) gid = '0'

  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${encodeURIComponent(gid)}`
}

/**
 * Convert + fetch a Google Sheet as CSV text.
 * @throws {SheetUrlError} on a malformed / unsupported URL (→ 400)
 * @throws {SheetFetchError} on network failure or non-2xx upstream (→ 502)
 */
export async function fetchSheetCsv(rawUrl: unknown): Promise<string> {
  const exportUrl = toCsvExportUrl(rawUrl)

  let res: Response
  try {
    res = await fetch(exportUrl, {
      redirect: 'follow',
      headers: { Accept: 'text/csv,*/*' }
    })
  } catch {
    throw new SheetFetchError('Could not reach Google Sheets. Check your connection and that the sheet link is shareable.')
  }

  if (!res.ok) {
    // A 401/403/404 from Google almost always means the sheet is not shared publicly.
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      throw new SheetFetchError(
        'Google Sheets returned ' + res.status + '. Make sure the sheet is shared as "Anyone with the link".'
      )
    }
    throw new SheetFetchError('Google Sheets request failed (HTTP ' + res.status + ')')
  }

  const text = await res.text()

  // When a sheet is private, Google often returns a 200 HTML sign-in page
  // instead of CSV. Detect that and surface a clear error.
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('text/html') || /^\s*<(!doctype|html)/i.test(text)) {
    throw new SheetFetchError(
      'Google returned a login page instead of CSV. Make sure the sheet is shared as "Anyone with the link".'
    )
  }

  return text
}
