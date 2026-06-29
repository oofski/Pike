import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import path from 'node:path'

// Resolve node:sqlite at runtime via require so Vite's import-analysis pass does
// not try to bundle it (it strips the `node:` prefix and fails to find "sqlite").
// node:sqlite ships with Node ≥22 behind the --experimental-sqlite flag, which
// vitest.config.ts passes to each forked worker via execArgv.
const require = createRequire(import.meta.url)
const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = path.resolve(__dirname, '../src/main/server/schema.sql')
const schemaSql = readFileSync(SCHEMA_PATH, 'utf8')

const EXPECTED_TABLES = [
  'users',
  'events',
  'pnms',
  'pnm_notes',
  'event_attendance',
  'votes',
  'messages',
  'sign_in_sessions',
  'voting_sessions',
  'api_keys',
  'app_settings'
]

function freshDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:')
  db.exec(schemaSql)
  // node:sqlite ignores the WAL pragma for :memory:, but enforce FK behaviour
  // explicitly so cascade/constraint assertions are exercised.
  db.exec('PRAGMA foreign_keys = ON;')
  return db
}

describe('schema.sql', () => {
  let db: DatabaseSync

  beforeEach(() => {
    db = freshDb()
  })

  it('creates all 11 tables from the design doc', () => {
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as Array<{ name: string }>
    const names = rows.map((r) => r.name).sort()
    expect(names).toHaveLength(EXPECTED_TABLES.length)
    for (const t of EXPECTED_TABLES) {
      expect(names).toContain(t)
    }
  })

  it('inserts a user, event, pnm, and attendance row', () => {
    db.prepare(
      "INSERT INTO users (id, email, name, password_hash, role) VALUES (?,?,?,?,?)"
    ).run('u1', 'rush@pike.test', 'Rush Chair', 'hash', 'rush_chair')

    db.prepare(
      "INSERT INTO events (id, title, type, start_time, created_by) VALUES (?,?,?,?,?)"
    ).run('e1', 'Bar Tab', 'bar_tab', '2026-01-10 21:00:00', 'u1')

    db.prepare(
      "INSERT INTO pnms (id, first_name, last_name, phone) VALUES (?,?,?,?)"
    ).run('p1', 'John', 'Smith', '(704) 555-1234')

    db.prepare(
      "INSERT INTO event_attendance (id, pnm_id, event_id) VALUES (?,?,?)"
    ).run('a1', 'p1', 'e1')

    expect((db.prepare('SELECT count(*) c FROM users').get() as { c: number }).c).toBe(1)
    expect((db.prepare('SELECT count(*) c FROM events').get() as { c: number }).c).toBe(1)
    expect((db.prepare('SELECT count(*) c FROM pnms').get() as { c: number }).c).toBe(1)
    expect((db.prepare('SELECT count(*) c FROM event_attendance').get() as { c: number }).c).toBe(1)
  })

  it('rejects an invalid role / status / type via CHECK constraints', () => {
    expect(() =>
      db
        .prepare("INSERT INTO users (id, email, name, password_hash, role) VALUES (?,?,?,?,?)")
        .run('ux', 'x@x.test', 'X', 'h', 'wizard')
    ).toThrow()

    expect(() =>
      db
        .prepare("INSERT INTO events (id, title, type, start_time) VALUES (?,?,?,?)")
        .run('ex', 'Bad', 'rave', '2026-01-01 00:00:00')
    ).toThrow()
  })

  it('flips a brother vote via the UNIQUE(pnm_id, voter_id) upsert', () => {
    db.prepare("INSERT INTO users (id, email, name, password_hash, role) VALUES (?,?,?,?,?)").run(
      'voter1',
      'b@pike.test',
      'Bro',
      'h',
      'brother'
    )
    db.prepare("INSERT INTO pnms (id, first_name, last_name, phone) VALUES (?,?,?,?)").run(
      'p1',
      'Jane',
      'Doe',
      '7045550000'
    )

    const upsert = db.prepare(
      `INSERT INTO votes (id, pnm_id, voter_id, decision) VALUES (?,?,?,?)
       ON CONFLICT(pnm_id, voter_id) DO UPDATE SET decision = excluded.decision, voted_at = datetime('now')`
    )

    upsert.run('v1', 'p1', 'voter1', 'yes')
    expect((db.prepare('SELECT count(*) c FROM votes').get() as { c: number }).c).toBe(1)
    expect(
      (db.prepare('SELECT decision FROM votes WHERE pnm_id=? AND voter_id=?').get('p1', 'voter1') as {
        decision: string
      }).decision
    ).toBe('yes')

    // Same brother votes again on the same PNM → no new row, decision flips.
    upsert.run('v2', 'p1', 'voter1', 'no')
    expect((db.prepare('SELECT count(*) c FROM votes').get() as { c: number }).c).toBe(1)
    expect(
      (db.prepare('SELECT decision FROM votes WHERE pnm_id=? AND voter_id=?').get('p1', 'voter1') as {
        decision: string
      }).decision
    ).toBe('no')
  })

  it('counts attendance per event with a correlated subquery', () => {
    db.prepare("INSERT INTO events (id, title, type, start_time) VALUES (?,?,?,?)").run(
      'e1',
      'Pong Night',
      'pong_night',
      '2026-01-12 20:00:00'
    )
    db.prepare("INSERT INTO events (id, title, type, start_time) VALUES (?,?,?,?)").run(
      'e2',
      'Empty Social',
      'social',
      '2026-01-13 20:00:00'
    )
    for (const [id, fn] of [
      ['p1', 'A'],
      ['p2', 'B'],
      ['p3', 'C']
    ]) {
      db.prepare("INSERT INTO pnms (id, first_name, last_name, phone) VALUES (?,?,?,?)").run(
        id,
        fn,
        'L',
        '70455500' + id.slice(1).padStart(2, '0')
      )
    }
    // e1 gets 3 attendees, e2 gets 0.
    let n = 0
    for (const pid of ['p1', 'p2', 'p3']) {
      db.prepare("INSERT INTO event_attendance (id, pnm_id, event_id) VALUES (?,?,?)").run(
        'att' + n++,
        pid,
        'e1'
      )
    }

    const rows = db
      .prepare(
        `SELECT e.id,
                (SELECT count(*) FROM event_attendance a WHERE a.event_id = e.id) AS attendees
         FROM events e ORDER BY e.id`
      )
      .all() as Array<{ id: string; attendees: number }>

    expect(rows.find((r) => r.id === 'e1')!.attendees).toBe(3)
    expect(rows.find((r) => r.id === 'e2')!.attendees).toBe(0)
  })

  it('rejects a duplicate phone via the UNIQUE index on pnms.phone', () => {
    db.prepare("INSERT INTO pnms (id, first_name, last_name, phone) VALUES (?,?,?,?)").run(
      'p1',
      'First',
      'Guy',
      '(704) 555-9999'
    )
    expect(() =>
      db
        .prepare("INSERT INTO pnms (id, first_name, last_name, phone) VALUES (?,?,?,?)")
        .run('p2', 'Second', 'Guy', '(704) 555-9999')
    ).toThrow(/UNIQUE/i)
  })

  it('enforces UNIQUE(pnm_id, event_id) on attendance', () => {
    db.prepare("INSERT INTO events (id, title, type, start_time) VALUES (?,?,?,?)").run(
      'e1',
      'Info Night',
      'info_night',
      '2026-01-14 19:00:00'
    )
    db.prepare("INSERT INTO pnms (id, first_name, last_name, phone) VALUES (?,?,?,?)").run(
      'p1',
      'Dup',
      'Check',
      '7045551111'
    )
    db.prepare("INSERT INTO event_attendance (id, pnm_id, event_id) VALUES (?,?,?)").run('a1', 'p1', 'e1')
    expect(() =>
      db
        .prepare("INSERT INTO event_attendance (id, pnm_id, event_id) VALUES (?,?,?)")
        .run('a2', 'p1', 'e1')
    ).toThrow(/UNIQUE/i)
  })
})
