import bcrypt from 'bcryptjs'
import { getDb, genId } from './db'

interface SeedUser {
  email: string
  name: string
  role: 'admin' | 'rush_chair' | 'brother'
  password: string
}

/** Accounts that always exist (re-created if missing). */
const CORE_USERS: SeedUser[] = [
  { email: 'admin@pikesigma.vanderbilt.edu', name: 'Sigma Admin', role: 'admin', password: 'pike1868' },
  { email: 'rush@pikesigma.vanderbilt.edu', name: 'Rush Chair', role: 'rush_chair', password: 'rush2026' }
]

const SAMPLE_BROTHERS: SeedUser[] = [
  { email: 'walker@pikesigma.vanderbilt.edu', name: 'Walker Bennett', role: 'brother', password: 'brother1' },
  { email: 'cole@pikesigma.vanderbilt.edu', name: 'Cole Harrington', role: 'brother', password: 'brother1' },
  { email: 'drew@pikesigma.vanderbilt.edu', name: 'Drew Callahan', role: 'brother', password: 'brother1' }
]

function ensureUser(u: SeedUser): string {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email) as { id: string } | undefined
  if (existing) return existing.id
  const id = genId()
  db.prepare(
    'INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)'
  ).run(id, u.email, u.name, bcrypt.hashSync(u.password, 10), u.role)
  return id
}

/** Idempotent. Creates core accounts always; sample data only on first run. */
export function runSeed(): void {
  const db = getDb()

  // Core + sample users
  CORE_USERS.forEach(ensureUser)
  const brotherIds = SAMPLE_BROTHERS.map(ensureUser)
  const rushChairId = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get('rush@pikesigma.vanderbilt.edu') as { id: string }

  // Ensure a bridge API key exists
  const keyCount = (db.prepare('SELECT COUNT(*) c FROM api_keys').get() as { c: number }).c
  if (keyCount === 0) {
    db.prepare('INSERT INTO api_keys (id, label, key) VALUES (?, ?, ?)').run(
      genId(),
      'Default Mac Bridge',
      'pike_' + genId()
    )
  }

  // Sample data only once
  const seeded = db.prepare("SELECT value FROM app_settings WHERE key = 'sample_seeded'").get() as
    | { value: string }
    | undefined
  if (seeded?.value === '1') return

  const day = 86400000
  const base = Date.now()
  const iso = (offsetDays: number, hour: number): string => {
    const d = new Date(base + offsetDays * day)
    d.setHours(hour, 0, 0, 0)
    return d.toISOString()
  }

  const events = [
    { title: 'Info Night at the House', type: 'info_night', location: 'PIKE House', start: iso(-6, 19), end: iso(-6, 21) },
    { title: 'Pong Tournament', type: 'pong_night', location: 'PIKE House Basement', start: iso(-3, 21), end: iso(-3, 23) },
    { title: 'Broadway Bar Tab', type: 'bar_tab', location: "Tin Roof, Broadway", start: iso(-1, 22), end: iso(0, 1) },
    { title: 'Date Party — Spring Formal', type: 'date_party', location: 'Omni Nashville', start: iso(4, 20), end: iso(4, 23) },
    { title: 'Brotherhood Social', type: 'social', location: 'Centennial Park', start: iso(7, 16), end: iso(7, 18) }
  ] as const

  const eventIds = events.map((e) => {
    const id = genId()
    db.prepare(
      'INSERT INTO events (id, title, type, location, description, start_time, end_time, created_by) VALUES (?,?,?,?,?,?,?,?)'
    ).run(id, e.title, e.type, e.location, 'Open to all PNMs. Come hang with the brothers.', e.start, e.end, rushChairId.id)
    return id
  })

  const pnms = [
    { f: 'John', l: 'Smith', p: '(615) 555-0142', rating: 'yes', status: 'invited' },
    { f: 'Michael', l: 'Johnson', p: '(615) 555-0188', rating: 'yes', status: 'pending' },
    { f: 'Chris', l: 'Williams', p: '(629) 555-0110', rating: 'maybe', status: 'pending' },
    { f: 'Tyler', l: 'Brown', p: '(615) 555-0173', rating: 'yes', status: 'accepted' },
    { f: 'Jordan', l: 'Davis', p: '(901) 555-0199', rating: 'maybe', status: 'pending' },
    { f: 'Ryan', l: 'Miller', p: '(615) 555-0125', rating: 'no', status: 'rejected' },
    { f: 'Brandon', l: 'Wilson', p: '(404) 555-0167', rating: 'yes', status: 'invited' },
    { f: 'Austin', l: 'Moore', p: '(615) 555-0151', rating: 'maybe', status: 'pending' }
  ] as const

  const pnmIds = pnms.map((m) => {
    const id = genId()
    db.prepare(
      'INSERT INTO pnms (id, first_name, last_name, phone, status, internal_rating, source) VALUES (?,?,?,?,?,?,?)'
    ).run(id, m.f, m.l, m.p, m.status, m.rating, 'sign_in_form')
    return id
  })

  // Attendance: spread PNMs across the past events
  const pastEvents = eventIds.slice(0, 3)
  pnmIds.forEach((pid, i) => {
    pastEvents.slice(0, (i % 3) + 1).forEach((eid) => {
      try {
        db.prepare('INSERT INTO event_attendance (id, pnm_id, event_id) VALUES (?,?,?)').run(genId(), pid, eid)
      } catch {
        /* unique violation — ignore */
      }
    })
  })

  // A couple of notes
  db.prepare('INSERT INTO pnm_notes (id, pnm_id, author_id, content) VALUES (?,?,?,?)').run(
    genId(),
    pnmIds[0],
    brotherIds[0],
    'Great guy, knows half the pledge class already. Strong yes from me.'
  )
  db.prepare('INSERT INTO pnm_notes (id, pnm_id, author_id, content) VALUES (?,?,?,?)').run(
    genId(),
    pnmIds[2],
    brotherIds[1],
    'Seemed a little quiet at info night — want to see him at pong.'
  )

  db.prepare(
    "INSERT INTO app_settings (key, value) VALUES ('sample_seeded', '1') ON CONFLICT(key) DO UPDATE SET value='1'"
  ).run()
}
