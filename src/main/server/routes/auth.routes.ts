import { Router } from 'express'
import { getDb, genId } from '../db'
import { signToken, hashPassword, verifyPassword, requireAuth, requireRole } from '../auth'
import type { AuthUser, LoginRequest, Role } from '@shared/types'

export const authRouter = Router()

authRouter.post('/login', (req, res) => {
  const { email, password } = (req.body || {}) as LoginRequest
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }
  const row = getDb()
    .prepare('SELECT id, email, name, role, password_hash, created_at FROM users WHERE email = ?')
    .get(String(email).toLowerCase().trim()) as
    | (AuthUser & { password_hash: string })
    | undefined
  if (!row || !verifyPassword(password, row.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }
  const user: AuthUser = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    created_at: row.created_at
  }
  res.json({ token: signToken(user), user })
})

authRouter.post('/logout', (_req, res) => res.json({ ok: true }))

authRouter.get('/me', requireAuth, (req, res) => res.json(req.user))

// ---- User management (admin) ----------------------------------------------

authRouter.get('/users', requireAuth, requireRole('admin'), (_req, res) => {
  const users = getDb()
    .prepare('SELECT id, email, name, role, created_at FROM users ORDER BY created_at')
    .all()
  res.json(users)
})

authRouter.post('/users', requireAuth, requireRole('admin'), (req, res) => {
  const { email, name, role, password } = (req.body || {}) as {
    email: string
    name: string
    role: Role
    password: string
  }
  if (!email || !name || !role || !password) {
    res.status(400).json({ error: 'email, name, role and password are required' })
    return
  }
  if (!['admin', 'rush_chair', 'brother'].includes(role)) {
    res.status(400).json({ error: 'Invalid role' })
    return
  }
  const id = genId()
  try {
    getDb()
      .prepare('INSERT INTO users (id, email, name, password_hash, role) VALUES (?,?,?,?,?)')
      .run(id, String(email).toLowerCase().trim(), name, hashPassword(password), role)
  } catch {
    res.status(409).json({ error: 'A user with that email already exists' })
    return
  }
  res.status(201).json({ id, email, name, role })
})

authRouter.delete('/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  if (req.params.id === req.user!.id) {
    res.status(400).json({ error: 'You cannot delete your own account' })
    return
  }
  getDb().prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// ---- Mac bridge API key ----------------------------------------------------

authRouter.get('/bridge-key', requireAuth, requireRole('admin', 'rush_chair'), (_req, res) => {
  const row = getDb()
    .prepare('SELECT key, label, last_used FROM api_keys ORDER BY created_at LIMIT 1')
    .get() as { key: string; label: string; last_used: string | null } | undefined
  res.json(row || null)
})

authRouter.post('/bridge-key/rotate', requireAuth, requireRole('admin', 'rush_chair'), (_req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM api_keys').run()
  const key = 'pike_' + genId()
  db.prepare('INSERT INTO api_keys (id, label, key) VALUES (?,?,?)').run(
    genId(),
    'Mac Bridge',
    key
  )
  res.json({ key })
})
