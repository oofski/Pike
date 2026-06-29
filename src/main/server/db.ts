import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { randomBytes } from 'node:crypto'
import schemaSql from './schema.sql?raw'

let db: Database.Database | null = null

/** Directory where the app stores user data (db + photos). */
export function dataDir(): string {
  // app may be undefined in non-electron test contexts; fall back to cwd.
  const base = app?.getPath ? app.getPath('userData') : path.join(process.cwd(), '.pike-data')
  fs.mkdirSync(base, { recursive: true })
  return base
}

/** Directory where PNM photos are stored (replaces Cloudflare R2). */
export function photosDir(): string {
  const dir = path.join(dataDir(), 'pnm-photos')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function getDb(): Database.Database {
  if (db) return db
  const dbPath = path.join(dataDir(), 'pike-rush.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(schemaSql)
  return db
}

/** 32-char hex id, matching the design doc's lower(hex(randomblob(16))). */
export function genId(): string {
  return randomBytes(16).toString('hex')
}

export function now(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}
