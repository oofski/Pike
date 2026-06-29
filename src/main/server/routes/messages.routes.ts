import { Router } from 'express'
import { getDb, genId } from '../db'
import { requireAuth, requireRole, requireBridgeKey } from '../auth'
import type { QueueMessagesInput } from '@shared/types'

export const messagesRouter = Router()

// ---- Bridge endpoints (Mac iMessage bridge authenticates with an API key) --
// Declared BEFORE requireAuth so they use key auth, not JWT.
messagesRouter.get('/pending', requireBridgeKey, (_req, res) => {
  const rows = getDb()
    .prepare("SELECT id, phone, body FROM messages WHERE status = 'pending' ORDER BY created_at LIMIT 50")
    .all()
  res.json(rows)
})

messagesRouter.patch('/:id', requireBridgeKey, (req, res) => {
  const status = req.body?.status
  if (!['sent', 'failed'].includes(status)) {
    res.status(400).json({ error: 'status must be sent or failed' })
    return
  }
  getDb()
    .prepare("UPDATE messages SET status = ?, sent_at = datetime('now') WHERE id = ?")
    .run(status, req.params.id)
  res.json({ ok: true })
})

// ---- App endpoints (JWT) --------------------------------------------------
messagesRouter.get('/', requireAuth, (req, res) => {
  if (req.query.view === 'campaigns') {
    const rows = getDb()
      .prepare(
        `SELECT batch_id,
           MIN(created_at) AS created_at,
           SUBSTR(MIN(body), 1, 80) AS body_preview,
           COUNT(*) AS recipients,
           COALESCE(SUM(status='sent'),0) AS sent,
           COALESCE(SUM(status='failed'),0) AS failed,
           COALESCE(SUM(status='pending'),0) AS pending
         FROM messages WHERE batch_id IS NOT NULL
         GROUP BY batch_id ORDER BY created_at DESC`
      )
      .all()
    res.json(rows)
    return
  }
  const status = req.query.status as string | undefined
  const rows = status
    ? getDb().prepare('SELECT * FROM messages WHERE status = ? ORDER BY created_at DESC').all(status)
    : getDb().prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT 500').all()
  res.json(rows)
})

messagesRouter.post('/queue', requireAuth, requireRole('admin', 'rush_chair'), (req, res) => {
  const { pnm_ids, body } = (req.body || {}) as QueueMessagesInput
  if (!Array.isArray(pnm_ids) || !pnm_ids.length || !body?.trim()) {
    res.status(400).json({ error: 'pnm_ids and a message body are required' })
    return
  }
  const db = getDb()
  const batchId = genId()
  const insert = db.prepare(
    `INSERT INTO messages (id, batch_id, pnm_id, phone, body, status, created_by)
     VALUES (?,?,?,?,?, 'pending', ?)`
  )
  const getPnm = db.prepare('SELECT id, phone FROM pnms WHERE id = ?')
  let queued = 0
  const tx = db.transaction(() => {
    for (const pid of pnm_ids) {
      const pnm = getPnm.get(pid) as { id: string; phone: string } | undefined
      if (!pnm) continue
      insert.run(genId(), batchId, pnm.id, pnm.phone, body.trim(), req.user!.id)
      queued++
    }
  })
  tx()
  res.status(201).json({ batch_id: batchId, queued })
})
