import express from 'express'
import cors from 'cors'
import http from 'node:http'
import path from 'node:path'
import { getDb, photosDir } from './db'
import { runSeed } from './seed'
import { authRouter } from './routes/auth.routes'
import { eventsRouter } from './routes/events.routes'
import { pnmsRouter } from './routes/pnms.routes'
import { signinRouter } from './routes/signin.routes'
import { votingRouter, votesRouter } from './routes/voting.routes'
import { messagesRouter } from './routes/messages.routes'
import { statsRouter } from './routes/stats.routes'
import { publicRouter } from './routes/public'

const PREFERRED_PORT = 47600

export interface RunningServer {
  port: number
  close: () => Promise<void>
}

export function buildApp(): express.Express {
  // Make sure DB + seed are ready before any request is served.
  getDb()
  runSeed()

  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '15mb' }))

  app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'PIKE Rush' }))

  // Static photo storage (replaces Cloudflare R2)
  app.use('/photos', express.static(photosDir(), { maxAge: '1h' }))

  // JSON API
  app.use('/api/auth', authRouter)
  app.use('/api/events', eventsRouter)
  app.use('/api/pnms', pnmsRouter)
  app.use('/api/signin-sessions', signinRouter)
  app.use('/api/voting', votingRouter)
  app.use('/api/votes', votesRouter)
  app.use('/api/messages', messagesRouter)
  app.use('/api/stats', statsRouter)

  // Public, login-free sign-in page served to PNM phones over LAN
  app.use('/', publicRouter)

  // 404 for unknown API routes
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error('[server] error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  })

  return app
}

export function startServer(preferredPort = PREFERRED_PORT): Promise<RunningServer> {
  const app = buildApp()
  return new Promise((resolve, reject) => {
    const server = http.createServer(app)

    const onError = (err: NodeJS.ErrnoException): void => {
      if (err.code === 'EADDRINUSE') {
        server.removeListener('error', onError)
        // fall back to an ephemeral port
        server.listen(0, '0.0.0.0')
      } else {
        reject(err)
      }
    }
    server.on('error', onError)
    server.listen(preferredPort, '0.0.0.0', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : preferredPort
      resolve({
        port,
        close: () =>
          new Promise<void>((res) => {
            server.close(() => res())
          })
      })
    })
  })
}

export { path }
