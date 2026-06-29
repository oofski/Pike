import { Router } from 'express'
import { getDb, genId } from '../db'
import { requireAuth, requireRole } from '../auth'
import type { CreateEventInput, EventType, UpdateEventInput } from '@shared/types'

export const eventsRouter = Router()

const EVENT_TYPES: EventType[] = ['bar_tab', 'date_party', 'pong_night', 'social', 'info_night', 'other']

eventsRouter.use(requireAuth)

// List all events with attendance counts
eventsRouter.get('/', (_req, res) => {
  const rows = getDb()
    .prepare(
      `SELECT e.*, (SELECT COUNT(*) FROM event_attendance a WHERE a.event_id = e.id) AS attendance_count
       FROM events e ORDER BY e.start_time DESC`
    )
    .all()
  res.json(rows)
})

eventsRouter.get('/:id', (req, res) => {
  const row = getDb()
    .prepare(
      `SELECT e.*, (SELECT COUNT(*) FROM event_attendance a WHERE a.event_id = e.id) AS attendance_count
       FROM events e WHERE e.id = ?`
    )
    .get(req.params.id)
  if (!row) {
    res.status(404).json({ error: 'Event not found' })
    return
  }
  res.json(row)
})

eventsRouter.get('/:id/attendees', (req, res) => {
  const rows = getDb()
    .prepare(
      `SELECT p.*, a.signed_in_at FROM event_attendance a
       JOIN pnms p ON p.id = a.pnm_id
       WHERE a.event_id = ? ORDER BY a.signed_in_at DESC`
    )
    .all(req.params.id)
  res.json(rows)
})

eventsRouter.post('/', requireRole('admin', 'rush_chair'), (req, res) => {
  const body = (req.body || {}) as CreateEventInput
  if (!body.title || !body.type || !body.start_time) {
    res.status(400).json({ error: 'title, type and start_time are required' })
    return
  }
  if (!EVENT_TYPES.includes(body.type)) {
    res.status(400).json({ error: 'Invalid event type' })
    return
  }
  const id = genId()
  getDb()
    .prepare(
      `INSERT INTO events (id, title, type, location, description, start_time, end_time, created_by)
       VALUES (?,?,?,?,?,?,?,?)`
    )
    .run(
      id,
      body.title,
      body.type,
      body.location ?? null,
      body.description ?? null,
      body.start_time,
      body.end_time ?? null,
      req.user!.id
    )
  res.status(201).json(getDb().prepare('SELECT * FROM events WHERE id = ?').get(id))
})

eventsRouter.patch('/:id', requireRole('admin', 'rush_chair'), (req, res) => {
  const body = (req.body || {}) as UpdateEventInput
  const existing = getDb().prepare('SELECT * FROM events WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Event not found' })
    return
  }
  if (body.type && !EVENT_TYPES.includes(body.type)) {
    res.status(400).json({ error: 'Invalid event type' })
    return
  }
  const fields: string[] = []
  const values: unknown[] = []
  for (const key of ['title', 'type', 'location', 'description', 'start_time', 'end_time'] as const) {
    if (key in body) {
      fields.push(`${key} = ?`)
      values.push((body as Record<string, unknown>)[key] ?? null)
    }
  }
  if (fields.length) {
    values.push(req.params.id)
    getDb().prepare(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }
  res.json(getDb().prepare('SELECT * FROM events WHERE id = ?').get(req.params.id))
})

eventsRouter.delete('/:id', requireRole('admin', 'rush_chair'), (req, res) => {
  getDb().prepare('DELETE FROM events WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})
