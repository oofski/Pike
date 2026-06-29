import { Router } from 'express'
import { getDb, genId } from '../db'
import { requireAuth, requireRole } from '../auth'
import type { CastVoteInput, VoteDecision } from '@shared/types'

export const votingRouter = Router()
export const votesRouter = Router()

votingRouter.use(requireAuth)
votesRouter.use(requireAuth)

function activeSession() {
  return getDb().prepare('SELECT * FROM voting_sessions WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1').get() as
    | {
        id: string
        is_active: number
        current_pnm_id: string | null
        pnm_order: string
        results_revealed: number
      }
    | undefined
}

function tallyFor(pnmId: string) {
  return getDb()
    .prepare(
      `SELECT
        COALESCE(SUM(decision='yes'),0) AS yes,
        COALESCE(SUM(decision='no'),0) AS no,
        COALESCE(SUM(decision='abstain'),0) AS abstain,
        COUNT(*) AS total
       FROM votes WHERE pnm_id = ?`
    )
    .get(pnmId) as { yes: number; no: number; abstain: number; total: number }
}

// Current active voting session — polled every 2s by /vote and /voting/present
votingRouter.get('/session', (req, res) => {
  const session = activeSession()
  if (!session) {
    res.json({ active: false })
    return
  }
  const order: string[] = JSON.parse(session.pnm_order || '[]')
  const currentPnm = session.current_pnm_id
    ? getDb().prepare('SELECT * FROM pnms WHERE id = ?').get(session.current_pnm_id)
    : null
  const myVote = session.current_pnm_id
    ? (getDb()
        .prepare('SELECT decision FROM votes WHERE pnm_id = ? AND voter_id = ?')
        .get(session.current_pnm_id, req.user!.id) as { decision: VoteDecision } | undefined)
    : undefined
  res.json({
    active: true,
    session,
    order,
    index: session.current_pnm_id ? order.indexOf(session.current_pnm_id) : -1,
    current_pnm: currentPnm,
    tally: session.current_pnm_id ? tallyFor(session.current_pnm_id) : null,
    my_vote: myVote?.decision ?? null,
    results_revealed: !!session.results_revealed
  })
})

// Start a voting session
votingRouter.post('/session', requireRole('admin', 'rush_chair'), (req, res) => {
  const order: string[] = Array.isArray(req.body?.pnm_order) ? req.body.pnm_order : []
  if (!order.length) {
    res.status(400).json({ error: 'pnm_order must contain at least one PNM' })
    return
  }
  const db = getDb()
  db.prepare('UPDATE voting_sessions SET is_active = 0 WHERE is_active = 1').run()
  const id = genId()
  db.prepare(
    `INSERT INTO voting_sessions (id, is_active, current_pnm_id, pnm_order, results_revealed, started_by)
     VALUES (?, 1, ?, ?, 0, ?)`
  ).run(id, order[0], JSON.stringify(order), req.user!.id)
  res.status(201).json(db.prepare('SELECT * FROM voting_sessions WHERE id = ?').get(id))
})

// Advance to next / previous / specific PNM
votingRouter.post('/session/advance', requireRole('admin', 'rush_chair'), (req, res) => {
  const session = activeSession()
  if (!session) {
    res.status(404).json({ error: 'No active voting session' })
    return
  }
  const order: string[] = JSON.parse(session.pnm_order || '[]')
  let idx = session.current_pnm_id ? order.indexOf(session.current_pnm_id) : -1
  const direction = req.body?.direction
  if (req.body?.pnm_id && order.includes(req.body.pnm_id)) {
    idx = order.indexOf(req.body.pnm_id)
  } else if (direction === 'prev') {
    idx = Math.max(0, idx - 1)
  } else {
    idx = Math.min(order.length - 1, idx + 1)
  }
  getDb()
    .prepare(
      "UPDATE voting_sessions SET current_pnm_id = ?, results_revealed = 0, updated_at = datetime('now') WHERE id = ?"
    )
    .run(order[idx], session.id)
  res.json({ ok: true, current_pnm_id: order[idx], index: idx })
})

// Reveal / hide results for the current PNM
votingRouter.post('/session/reveal', requireRole('admin', 'rush_chair'), (req, res) => {
  const session = activeSession()
  if (!session) {
    res.status(404).json({ error: 'No active voting session' })
    return
  }
  const reveal = req.body?.revealed === false ? 0 : 1
  getDb()
    .prepare("UPDATE voting_sessions SET results_revealed = ?, updated_at = datetime('now') WHERE id = ?")
    .run(reveal, session.id)
  res.json({ ok: true, results_revealed: !!reveal })
})

// Mark the current (or specified) PNM accepted / rejected
votingRouter.post('/session/decide', requireRole('admin', 'rush_chair'), (req, res) => {
  const session = activeSession()
  const pnmId = req.body?.pnm_id || session?.current_pnm_id
  const status = req.body?.status
  if (!pnmId || !['accepted', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'pnm_id and status (accepted|rejected) required' })
    return
  }
  getDb()
    .prepare("UPDATE pnms SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, pnmId)
  res.json({ ok: true })
})

// End the session
votingRouter.post('/session/end', requireRole('admin', 'rush_chair'), (_req, res) => {
  getDb().prepare('UPDATE voting_sessions SET is_active = 0 WHERE is_active = 1').run()
  res.json({ ok: true })
})

// ---- Votes ----------------------------------------------------------------
votesRouter.post('/', (req, res) => {
  const { pnm_id, decision } = (req.body || {}) as CastVoteInput
  if (!pnm_id || !['yes', 'no', 'abstain'].includes(decision)) {
    res.status(400).json({ error: 'pnm_id and a valid decision are required' })
    return
  }
  getDb()
    .prepare(
      `INSERT INTO votes (id, pnm_id, voter_id, decision) VALUES (?,?,?,?)
       ON CONFLICT(pnm_id, voter_id) DO UPDATE SET decision = excluded.decision, voted_at = datetime('now')`
    )
    .run(genId(), pnm_id, req.user!.id, decision)
  res.status(201).json({ ok: true, tally: tallyFor(pnm_id) })
})

votesRouter.get('/:pnmId', (req, res) => {
  res.json({ pnm_id: req.params.pnmId, ...tallyFor(req.params.pnmId) })
})
