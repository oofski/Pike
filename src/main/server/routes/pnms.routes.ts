import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { getDb, genId, photosDir } from '../db'
import { requireAuth, requireRole } from '../auth'
import { normalizePhone, isValidPhone } from '../util'
import type { BulkPnmInput, CreatePnmInput, PnmStatus, Rating } from '@shared/types'

export const pnmsRouter = Router()
pnmsRouter.use(requireAuth)

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

// ---- List with filters / search / sort ------------------------------------
pnmsRouter.get('/', (req, res) => {
  const { q, status, rating, source, event_id, sort, order } = req.query as Record<string, string>
  const where: string[] = []
  const params: unknown[] = []

  if (q) {
    where.push('(p.first_name LIKE ? OR p.last_name LIKE ? OR p.phone LIKE ?)')
    const like = `%${q}%`
    params.push(like, like, like)
  }
  if (status) {
    where.push('p.status = ?')
    params.push(status)
  }
  if (rating) {
    where.push('p.internal_rating = ?')
    params.push(rating)
  }
  if (source) {
    where.push('p.source = ?')
    params.push(source)
  }
  if (event_id) {
    where.push('EXISTS (SELECT 1 FROM event_attendance a WHERE a.pnm_id = p.id AND a.event_id = ?)')
    params.push(event_id)
  }

  const sortMap: Record<string, string> = {
    name: 'p.first_name COLLATE NOCASE',
    created: 'p.created_at',
    events: 'event_count',
    rating: "CASE p.internal_rating WHEN 'yes' THEN 0 WHEN 'maybe' THEN 1 ELSE 2 END"
  }
  const sortCol = sortMap[sort] || 'p.created_at'
  const dir = order === 'asc' ? 'ASC' : sort === 'name' ? 'ASC' : 'DESC'

  const sql = `
    SELECT p.*,
      (SELECT COUNT(*) FROM event_attendance a WHERE a.pnm_id = p.id) AS event_count,
      (SELECT COUNT(*) FROM pnm_notes n WHERE n.pnm_id = p.id) AS note_count,
      (SELECT COUNT(*) FROM votes v WHERE v.pnm_id = p.id AND v.decision = 'yes') AS vote_yes,
      (SELECT COUNT(*) FROM votes v WHERE v.pnm_id = p.id AND v.decision = 'no') AS vote_no,
      (SELECT COUNT(*) FROM votes v WHERE v.pnm_id = p.id AND v.decision = 'abstain') AS vote_abstain
    FROM pnms p
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ${sortCol} ${dir}`
  res.json(getDb().prepare(sql).all(...params))
})

// ---- Create ---------------------------------------------------------------
pnmsRouter.post('/', requireRole('admin', 'rush_chair'), (req, res) => {
  const body = (req.body || {}) as CreatePnmInput
  if (!body.first_name || !body.last_name || !body.phone) {
    res.status(400).json({ error: 'first_name, last_name and phone are required' })
    return
  }
  const phone = normalizePhone(body.phone)
  const existing = getDb().prepare('SELECT id FROM pnms WHERE phone = ?').get(phone) as
    | { id: string }
    | undefined
  if (existing) {
    res.status(409).json({ error: 'A PNM with that phone number already exists', id: existing.id })
    return
  }
  const id = genId()
  getDb()
    .prepare(
      `INSERT INTO pnms (id, first_name, last_name, phone, email, status, internal_rating, source)
       VALUES (?,?,?,?,?,?,?,?)`
    )
    .run(
      id,
      body.first_name.trim(),
      body.last_name.trim(),
      phone,
      body.email ?? null,
      (body.status as PnmStatus) || 'pending',
      (body.internal_rating as Rating) || 'maybe',
      body.source || 'manual'
    )
  res.status(201).json(getDb().prepare('SELECT * FROM pnms WHERE id = ?').get(id))
})

// ---- Bulk import (CSV / Google Sheets) ------------------------------------
pnmsRouter.post('/bulk', requireRole('admin', 'rush_chair'), (req, res) => {
  const body = (req.body || {}) as BulkPnmInput
  const list = Array.isArray(body.pnms) ? body.pnms : []
  const db = getDb()
  let inserted = 0
  let duplicates = 0
  let invalid = 0
  const insertedIds: string[] = []

  const insert = db.prepare(
    `INSERT INTO pnms (id, first_name, last_name, phone, email, source) VALUES (?,?,?,?,?, 'google_sheets')`
  )
  const findByPhone = db.prepare('SELECT id FROM pnms WHERE phone = ?')
  const attend = db.prepare(
    'INSERT OR IGNORE INTO event_attendance (id, pnm_id, event_id) VALUES (?,?,?)'
  )

  const tx = db.transaction(() => {
    for (const raw of list) {
      if (!raw?.first_name || !raw?.last_name || !raw?.phone || !isValidPhone(raw.phone)) {
        invalid++
        continue
      }
      const phone = normalizePhone(raw.phone)
      const existing = findByPhone.get(phone) as { id: string } | undefined
      let pnmId: string
      if (existing) {
        duplicates++
        pnmId = existing.id
      } else {
        pnmId = genId()
        insert.run(pnmId, raw.first_name.trim(), raw.last_name.trim(), phone, raw.email ?? null)
        inserted++
        insertedIds.push(pnmId)
      }
      if (body.event_id) attend.run(genId(), pnmId, body.event_id)
    }
  })
  tx()
  res.json({ inserted, duplicates, invalid, inserted_ids: insertedIds })
})

// ---- Single profile -------------------------------------------------------
pnmsRouter.get('/:id', (req, res) => {
  const pnm = getDb().prepare('SELECT * FROM pnms WHERE id = ?').get(req.params.id)
  if (!pnm) {
    res.status(404).json({ error: 'PNM not found' })
    return
  }
  res.json(pnm)
})

pnmsRouter.get('/:id/events', (req, res) => {
  const rows = getDb()
    .prepare(
      `SELECT e.id, e.title, e.type, e.start_time, a.signed_in_at
       FROM event_attendance a JOIN events e ON e.id = a.event_id
       WHERE a.pnm_id = ? ORDER BY e.start_time DESC`
    )
    .all(req.params.id)
  res.json(rows)
})

pnmsRouter.patch('/:id', requireRole('admin', 'rush_chair', 'brother'), (req, res) => {
  const body = req.body || {}
  const existing = getDb().prepare('SELECT * FROM pnms WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'PNM not found' })
    return
  }
  // brothers may only change the internal_rating; chairs/admins can edit everything
  const allowed =
    req.user!.role === 'brother'
      ? (['internal_rating'] as const)
      : (['first_name', 'last_name', 'phone', 'email', 'status', 'internal_rating', 'photo_url', 'notes'] as const)
  const fields: string[] = []
  const values: unknown[] = []
  for (const key of allowed) {
    if (key in body) {
      let val = (body as Record<string, unknown>)[key]
      if (key === 'phone' && typeof val === 'string') val = normalizePhone(val)
      fields.push(`${key} = ?`)
      values.push(val ?? null)
    }
  }
  if (fields.length) {
    fields.push("updated_at = datetime('now')")
    values.push(req.params.id)
    getDb().prepare(`UPDATE pnms SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }
  res.json(getDb().prepare('SELECT * FROM pnms WHERE id = ?').get(req.params.id))
})

pnmsRouter.delete('/:id', requireRole('admin'), (req, res) => {
  getDb().prepare('DELETE FROM pnms WHERE id = ?').run(req.params.id)
  const dir = path.join(photosDir(), req.params.id)
  fs.rmSync(dir, { recursive: true, force: true })
  res.json({ ok: true })
})

// ---- Photo upload (replaces R2) -------------------------------------------
pnmsRouter.post('/:id/photo', requireRole('admin', 'rush_chair'), upload.single('photo'), (req, res) => {
  const pnm = getDb().prepare('SELECT id FROM pnms WHERE id = ?').get(req.params.id)
  if (!pnm) {
    res.status(404).json({ error: 'PNM not found' })
    return
  }
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' })
    return
  }
  const ext = (path.extname(req.file.originalname) || '.jpg').toLowerCase()
  const dir = path.join(photosDir(), req.params.id)
  fs.mkdirSync(dir, { recursive: true })
  const filename = `original${ext}`
  fs.writeFileSync(path.join(dir, filename), req.file.buffer)
  const photoUrl = `/photos/${req.params.id}/${filename}`
  getDb()
    .prepare("UPDATE pnms SET photo_url = ?, updated_at = datetime('now') WHERE id = ?")
    .run(photoUrl, req.params.id)
  res.json({ photo_url: photoUrl })
})

// ---- Notes ----------------------------------------------------------------
pnmsRouter.get('/:id/notes', (req, res) => {
  const rows = getDb()
    .prepare(
      `SELECT n.*, u.name AS author_name FROM pnm_notes n
       JOIN users u ON u.id = n.author_id
       WHERE n.pnm_id = ? ORDER BY n.created_at DESC`
    )
    .all(req.params.id)
  res.json(rows)
})

pnmsRouter.post('/:id/notes', (req, res) => {
  const content = (req.body?.content || '').toString().trim()
  if (!content) {
    res.status(400).json({ error: 'Note content is required' })
    return
  }
  const id = genId()
  getDb()
    .prepare('INSERT INTO pnm_notes (id, pnm_id, author_id, content) VALUES (?,?,?,?)')
    .run(id, req.params.id, req.user!.id, content)
  const row = getDb()
    .prepare(
      `SELECT n.*, u.name AS author_name FROM pnm_notes n JOIN users u ON u.id = n.author_id WHERE n.id = ?`
    )
    .get(id)
  res.status(201).json(row)
})

pnmsRouter.delete('/:id/notes/:noteId', (req, res) => {
  const note = getDb().prepare('SELECT author_id FROM pnm_notes WHERE id = ?').get(req.params.noteId) as
    | { author_id: string }
    | undefined
  if (!note) {
    res.status(404).json({ error: 'Note not found' })
    return
  }
  if (note.author_id !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'You can only delete your own notes' })
    return
  }
  getDb().prepare('DELETE FROM pnm_notes WHERE id = ?').run(req.params.noteId)
  res.json({ ok: true })
})
