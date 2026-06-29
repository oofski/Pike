import { Router } from 'express'
import { getDb, genId } from '../db'
import { requireAuth, requireRole } from '../auth'
import { normalizePhone, isValidPhone } from '../util'
import type { SignInSubmitInput } from '@shared/types'

export const signinRouter = Router()

// List sessions (auth)
signinRouter.get('/', requireAuth, (_req, res) => {
  const rows = getDb()
    .prepare(
      `SELECT s.*, e.title AS event_title,
        (SELECT COUNT(*) FROM event_attendance a WHERE a.event_id = s.event_id) AS attendance_count
       FROM sign_in_sessions s JOIN events e ON e.id = s.event_id
       ORDER BY s.created_at DESC`
    )
    .all()
  res.json(rows)
})

// Public: session info (so the phone page can show the event + confirm it's open)
signinRouter.get('/:id', (req, res) => {
  const row = getDb()
    .prepare(
      `SELECT s.id, s.event_id, s.is_open, e.title AS event_title, e.type AS event_type, e.location, e.start_time
       FROM sign_in_sessions s JOIN events e ON e.id = s.event_id WHERE s.id = ?`
    )
    .get(req.params.id)
  if (!row) {
    res.status(404).json({ error: 'Sign-in session not found' })
    return
  }
  res.json(row)
})

// Open a new sign-in session for an event
signinRouter.post('/', requireAuth, requireRole('admin', 'rush_chair'), (req, res) => {
  const eventId = (req.body?.event_id || '').toString()
  if (!eventId) {
    res.status(400).json({ error: 'event_id is required' })
    return
  }
  const event = getDb().prepare('SELECT id FROM events WHERE id = ?').get(eventId)
  if (!event) {
    res.status(404).json({ error: 'Event not found' })
    return
  }
  // Reuse an already-open session for this event if present
  const open = getDb()
    .prepare('SELECT * FROM sign_in_sessions WHERE event_id = ? AND is_open = 1')
    .get(eventId)
  if (open) {
    res.status(201).json(open)
    return
  }
  const id = genId()
  getDb().prepare('INSERT INTO sign_in_sessions (id, event_id) VALUES (?, ?)').run(id, eventId)
  res.status(201).json(getDb().prepare('SELECT * FROM sign_in_sessions WHERE id = ?').get(id))
})

// Close a session
signinRouter.post('/:id/close', requireAuth, requireRole('admin', 'rush_chair'), (req, res) => {
  const info = getDb()
    .prepare("UPDATE sign_in_sessions SET is_open = 0, closed_at = datetime('now') WHERE id = ?")
    .run(req.params.id)
  if (info.changes === 0) {
    res.status(404).json({ error: 'Sign-in session not found' })
    return
  }
  res.json({ ok: true })
})

// PUBLIC: a PNM submits their info from their phone
signinRouter.post('/:id/submit', (req, res) => {
  const db = getDb()
  const session = db
    .prepare('SELECT * FROM sign_in_sessions WHERE id = ?')
    .get(req.params.id) as { id: string; event_id: string; is_open: number } | undefined
  if (!session) {
    res.status(404).json({ error: 'Sign-in session not found' })
    return
  }
  if (!session.is_open) {
    res.status(403).json({ error: 'This sign-in is closed' })
    return
  }
  const body = (req.body || {}) as SignInSubmitInput
  if (!body.first_name || !body.last_name || !body.phone) {
    res.status(400).json({ error: 'First name, last name and phone are required' })
    return
  }
  if (!isValidPhone(body.phone)) {
    res.status(400).json({ error: 'Please enter a valid 10-digit phone number' })
    return
  }
  const phone = normalizePhone(body.phone)

  const tx = db.transaction(() => {
    let pnm = db.prepare('SELECT id FROM pnms WHERE phone = ?').get(phone) as { id: string } | undefined
    if (!pnm) {
      const id = genId()
      db.prepare(
        `INSERT INTO pnms (id, first_name, last_name, phone, email, source) VALUES (?,?,?,?,?, 'sign_in_form')`
      ).run(id, body.first_name.trim(), body.last_name.trim(), phone, body.email ?? null)
      pnm = { id }
    }
    db.prepare('INSERT OR IGNORE INTO event_attendance (id, pnm_id, event_id) VALUES (?,?,?)').run(
      genId(),
      pnm.id,
      session.event_id
    )
    return pnm.id
  })
  const pnmId = tx()
  res.status(201).json({ ok: true, pnm_id: pnmId })
})
