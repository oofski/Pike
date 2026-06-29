import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { getDb, genId } from './db'
import type { AuthUser, Role } from '@shared/types'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser
      bridgeKeyId?: string
    }
  }
}

/** JWT secret — generated once and persisted so tokens survive restarts. */
function jwtSecret(): string {
  const db = getDb()
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'jwt_secret'").get() as
    | { value: string }
    | undefined
  if (row) return row.value
  const secret = genId() + genId()
  db.prepare("INSERT INTO app_settings (key, value) VALUES ('jwt_secret', ?)").run(secret)
  return secret
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10)
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash)
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, role: user.role }, jwtSecret(), { expiresIn: '30d' })
}

function loadUser(id: string): AuthUser | undefined {
  return getDb()
    .prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?')
    .get(id) as AuthUser | undefined
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) return header.slice(7)
  const cookie = req.headers.cookie
  if (cookie) {
    const match = cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith('pike_token='))
    if (match) return decodeURIComponent(match.slice('pike_token='.length))
  }
  return null
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req)
  if (!token) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  try {
    const payload = jwt.verify(token, jwtSecret()) as { sub: string }
    const user = loadUser(payload.sub)
    if (!user) {
      res.status(401).json({ error: 'Invalid session' })
      return
    }
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }
    next()
  }
}

/** Auth for the local Mac iMessage bridge (api_keys table). */
export function requireBridgeKey(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req)
  if (!token) {
    res.status(401).json({ error: 'API key required' })
    return
  }
  const row = getDb().prepare('SELECT id FROM api_keys WHERE key = ?').get(token) as
    | { id: string }
    | undefined
  if (!row) {
    res.status(401).json({ error: 'Invalid API key' })
    return
  }
  getDb().prepare("UPDATE api_keys SET last_used = datetime('now') WHERE id = ?").run(row.id)
  req.bridgeKeyId = row.id
  next()
}
