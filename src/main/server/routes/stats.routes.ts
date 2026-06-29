import { Router } from 'express'
import { getDb } from '../db'
import { requireAuth } from '../auth'
import type { EventType } from '@shared/types'

export const statsRouter = Router()
statsRouter.use(requireAuth)

statsRouter.get('/overview', (_req, res) => {
  const db = getDb()
  const totalPnms = (db.prepare('SELECT COUNT(*) c FROM pnms').get() as { c: number }).c
  const eventsThisWeek = (
    db
      .prepare(
        "SELECT COUNT(*) c FROM events WHERE start_time >= datetime('now') AND start_time <= datetime('now', '+7 days')"
      )
      .get() as { c: number }
  ).c
  const attendanceRow = db
    .prepare(
      `SELECT AVG(cnt) avg FROM (
         SELECT COUNT(*) cnt FROM event_attendance GROUP BY event_id
       )`
    )
    .get() as { avg: number | null }
  const yesRated = (
    db.prepare("SELECT COUNT(*) c FROM pnms WHERE internal_rating = 'yes'").get() as { c: number }
  ).c
  const byStatus = db.prepare('SELECT status, COUNT(*) c FROM pnms GROUP BY status').all() as {
    status: string
    c: number
  }[]
  const statusMap: Record<string, number> = { pending: 0, invited: 0, accepted: 0, rejected: 0 }
  byStatus.forEach((r) => (statusMap[r.status] = r.c))

  res.json({
    total_pnms: totalPnms,
    events_this_week: eventsThisWeek,
    avg_attendance: Math.round((attendanceRow.avg || 0) * 10) / 10,
    yes_rated: yesRated,
    pending: statusMap.pending,
    invited: statusMap.invited,
    accepted: statusMap.accepted,
    rejected: statusMap.rejected
  })
})

statsRouter.get('/attendance', (_req, res) => {
  const types: EventType[] = ['bar_tab', 'date_party', 'pong_night', 'social', 'info_night', 'other']
  const rows = getDb()
    .prepare(
      `SELECT e.type AS type,
        COUNT(a.id) AS attendance,
        COUNT(DISTINCT e.id) AS events
       FROM events e LEFT JOIN event_attendance a ON a.event_id = e.id
       GROUP BY e.type`
    )
    .all() as { type: EventType; attendance: number; events: number }[]
  const map = new Map(rows.map((r) => [r.type, r]))
  res.json(types.map((t) => map.get(t) || { type: t, attendance: 0, events: 0 }))
})

statsRouter.get('/pnm-growth', (_req, res) => {
  // PNMs added per day over the last 30 days, with a cumulative running total.
  const rows = getDb()
    .prepare(
      `SELECT date(created_at) AS date, COUNT(*) AS count
       FROM pnms
       WHERE created_at >= datetime('now', '-30 days')
       GROUP BY date(created_at) ORDER BY date(created_at)`
    )
    .all() as { date: string; count: number }[]

  const priorCount = (
    getDb()
      .prepare("SELECT COUNT(*) c FROM pnms WHERE created_at < datetime('now', '-30 days')")
      .get() as { c: number }
  ).c

  let cumulative = priorCount
  const series = rows.map((r) => {
    cumulative += r.count
    return { date: r.date, count: r.count, cumulative }
  })
  res.json(series)
})
