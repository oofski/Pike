// Typed client for the embedded local server. This is the integration contract
// the rest of the renderer builds against.
import type {
  AuthUser,
  BulkPnmInput,
  BulkPnmResult,
  CreateEventInput,
  CreatePnmInput,
  EventAttendance,
  LoginResponse,
  Message,
  MessageCampaign,
  Pnm,
  PnmNote,
  PnmWithStats,
  RushEvent,
  ServerInfo,
  SignInSession,
  StatsOverview,
  AttendanceByType,
  PnmGrowthPoint,
  UpdateEventInput,
  VoteDecision
} from '@shared/types'

const TOKEN_KEY = 'pike_token'

let cachedInfo: ServerInfo | null = null

export async function serverInfo(): Promise<ServerInfo> {
  if (cachedInfo) return cachedInfo
  cachedInfo = await window.pike.getServerInfo()
  return cachedInfo
}

async function baseUrl(): Promise<string> {
  return (await serverInfo()).baseUrl
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

interface RequestOpts {
  method?: string
  body?: unknown
  raw?: BodyInit
  isForm?: boolean
}

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const base = await baseUrl()
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let body: BodyInit | undefined
  if (opts.isForm) {
    body = opts.raw
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }
  const res = await fetch(base + path, { method: opts.method || 'GET', headers, body })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    throw new ApiError(data?.error || res.statusText, res.status)
  }
  return data as T
}

/** Resolve a stored photo_url (e.g. /photos/<id>/original.jpg) to a full URL. */
export function photoUrl(rel: string | null | undefined): string | null {
  if (!rel) return null
  if (rel.startsWith('http')) return rel
  return (cachedInfo?.baseUrl || '') + rel
}

export const api = {
  serverInfo,
  photoUrl,

  auth: {
    login: (email: string, password: string) =>
      request<LoginResponse>('/api/auth/login', { method: 'POST', body: { email, password } }),
    me: () => request<AuthUser>('/api/auth/me'),
    users: () => request<AuthUser[]>('/api/auth/users'),
    createUser: (input: { email: string; name: string; role: string; password: string }) =>
      request<AuthUser>('/api/auth/users', { method: 'POST', body: input }),
    deleteUser: (id: string) => request<{ ok: true }>(`/api/auth/users/${id}`, { method: 'DELETE' }),
    bridgeKey: () => request<{ key: string; label: string; last_used: string | null } | null>('/api/auth/bridge-key'),
    rotateBridgeKey: () => request<{ key: string }>('/api/auth/bridge-key/rotate', { method: 'POST' })
  },

  events: {
    list: () => request<RushEvent[]>('/api/events'),
    get: (id: string) => request<RushEvent>(`/api/events/${id}`),
    attendees: (id: string) => request<(Pnm & { signed_in_at: string })[]>(`/api/events/${id}/attendees`),
    create: (input: CreateEventInput) => request<RushEvent>('/api/events', { method: 'POST', body: input }),
    update: (id: string, input: UpdateEventInput) =>
      request<RushEvent>(`/api/events/${id}`, { method: 'PATCH', body: input }),
    remove: (id: string) => request<{ ok: true }>(`/api/events/${id}`, { method: 'DELETE' })
  },

  pnms: {
    list: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString()
      return request<PnmWithStats[]>(`/api/pnms${qs ? '?' + qs : ''}`)
    },
    get: (id: string) => request<Pnm>(`/api/pnms/${id}`),
    events: (id: string) => request<EventAttendance[]>(`/api/pnms/${id}/events`),
    create: (input: CreatePnmInput) => request<Pnm>('/api/pnms', { method: 'POST', body: input }),
    update: (id: string, input: Partial<Pnm>) => request<Pnm>(`/api/pnms/${id}`, { method: 'PATCH', body: input }),
    remove: (id: string) => request<{ ok: true }>(`/api/pnms/${id}`, { method: 'DELETE' }),
    bulk: (input: BulkPnmInput) => request<BulkPnmResult>('/api/pnms/bulk', { method: 'POST', body: input }),
    importSheet: (url: string) =>
      request<{ csv: string }>('/api/pnms/import-sheet', { method: 'POST', body: { url } }),
    uploadPhoto: (id: string, file: File) => {
      const form = new FormData()
      form.append('photo', file)
      return request<{ photo_url: string }>(`/api/pnms/${id}/photo`, { method: 'POST', isForm: true, raw: form })
    },
    notes: (id: string) => request<PnmNote[]>(`/api/pnms/${id}/notes`),
    addNote: (id: string, content: string) =>
      request<PnmNote>(`/api/pnms/${id}/notes`, { method: 'POST', body: { content } }),
    deleteNote: (id: string, noteId: string) =>
      request<{ ok: true }>(`/api/pnms/${id}/notes/${noteId}`, { method: 'DELETE' })
  },

  signin: {
    list: () => request<(SignInSession & { attendance_count: number })[]>('/api/signin-sessions'),
    open: (eventId: string) => request<SignInSession>('/api/signin-sessions', { method: 'POST', body: { event_id: eventId } }),
    close: (id: string) => request<{ ok: true }>(`/api/signin-sessions/${id}/close`, { method: 'POST' })
  },

  voting: {
    session: () => request<VotingSessionResponse>('/api/voting/session'),
    start: (pnmOrder: string[]) => request('/api/voting/session', { method: 'POST', body: { pnm_order: pnmOrder } }),
    advance: (opts: { direction?: 'next' | 'prev'; pnm_id?: string }) =>
      request('/api/voting/session/advance', { method: 'POST', body: opts }),
    reveal: (revealed: boolean) => request('/api/voting/session/reveal', { method: 'POST', body: { revealed } }),
    decide: (status: 'accepted' | 'rejected', pnmId?: string) =>
      request('/api/voting/session/decide', { method: 'POST', body: { status, pnm_id: pnmId } }),
    end: () => request('/api/voting/session/end', { method: 'POST' }),
    castVote: (pnmId: string, decision: VoteDecision) =>
      request('/api/votes', { method: 'POST', body: { pnm_id: pnmId, decision } }),
    tally: (pnmId: string) => request(`/api/votes/${pnmId}`)
  },

  messages: {
    list: (status?: string) => request<Message[]>(`/api/messages${status ? '?status=' + status : ''}`),
    campaigns: () => request<MessageCampaign[]>('/api/messages?view=campaigns'),
    queue: (pnmIds: string[], body: string) =>
      request<{ batch_id: string; queued: number }>('/api/messages/queue', {
        method: 'POST',
        body: { pnm_ids: pnmIds, body }
      })
  },

  stats: {
    overview: () => request<StatsOverview>('/api/stats/overview'),
    attendance: () => request<AttendanceByType[]>('/api/stats/attendance'),
    growth: () => request<PnmGrowthPoint[]>('/api/stats/pnm-growth')
  }
}

export interface VotingSessionResponse {
  active: boolean
  session?: { id: string; current_pnm_id: string | null; results_revealed: number }
  order?: string[]
  index?: number
  current_pnm?: Pnm | null
  tally?: { yes: number; no: number; abstain: number; total: number } | null
  my_vote?: VoteDecision | null
  results_revealed?: boolean
}
