// Shared domain types — single source of truth for main process, preload, and renderer.
// Mirrors the database schema in src/main/server/schema.sql.

export type Role = 'admin' | 'rush_chair' | 'brother'

export type EventType =
  | 'bar_tab'
  | 'date_party'
  | 'pong_night'
  | 'social'
  | 'info_night'
  | 'other'

export type PnmStatus = 'pending' | 'invited' | 'accepted' | 'rejected'
export type Rating = 'yes' | 'maybe' | 'no'
export type PnmSource = 'manual' | 'google_sheets' | 'sign_in_form'
export type VoteDecision = 'yes' | 'no' | 'abstain'
export type MessageStatus = 'pending' | 'sent' | 'failed'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  created_at: string
}

/** User shape returned to clients (never includes password hash). */
export type AuthUser = User

export interface RushEvent {
  id: string
  title: string
  type: EventType
  location: string | null
  description: string | null
  start_time: string // ISO 8601
  end_time: string | null
  created_by: string | null
  created_at: string
  /** Computed: number of PNMs that signed in to this event. */
  attendance_count?: number
}

export interface Pnm {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
  photo_url: string | null
  status: PnmStatus
  internal_rating: Rating
  notes: string | null
  source: PnmSource
  created_at: string
  updated_at: string
}

export interface PnmWithStats extends Pnm {
  event_count: number
  note_count: number
  vote_yes: number
  vote_no: number
  vote_abstain: number
}

export interface PnmNote {
  id: string
  pnm_id: string
  author_id: string
  author_name: string
  content: string
  created_at: string
}

export interface EventAttendance {
  id: string
  pnm_id: string
  event_id: string
  signed_in_at: string
  event_title?: string
  event_type?: EventType
  event_start_time?: string
}

export interface Vote {
  id: string
  pnm_id: string
  voter_id: string
  decision: VoteDecision
  voted_at: string
}

export interface VoteTally {
  pnm_id: string
  yes: number
  no: number
  abstain: number
  total: number
}

export interface Message {
  id: string
  pnm_id: string | null
  phone: string
  body: string
  status: MessageStatus
  created_by: string | null
  created_at: string
  sent_at: string | null
}

/** Aggregated view of one "Queue Messages" action. */
export interface MessageCampaign {
  batch_id: string
  created_at: string
  body_preview: string
  recipients: number
  sent: number
  failed: number
  pending: number
}

export interface SignInSession {
  id: string
  event_id: string
  is_open: 0 | 1
  created_at: string
  closed_at: string | null
  event_title?: string
}

export interface VotingSession {
  id: string
  is_active: 0 | 1
  current_pnm_id: string | null
  pnm_order: string // JSON array of pnm ids
  results_revealed: 0 | 1
  started_by: string | null
  created_at: string
  updated_at: string
}

// ------------------------------------------------------------------
// Request / Response DTOs
// ------------------------------------------------------------------

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export interface CreateEventInput {
  title: string
  type: EventType
  location?: string | null
  description?: string | null
  start_time: string
  end_time?: string | null
}

export type UpdateEventInput = Partial<CreateEventInput>

export interface CreatePnmInput {
  first_name: string
  last_name: string
  phone: string
  email?: string | null
  status?: PnmStatus
  internal_rating?: Rating
  source?: PnmSource
}

export interface BulkPnmInput {
  pnms: CreatePnmInput[]
  event_id?: string | null
}

export interface BulkPnmResult {
  inserted: number
  duplicates: number
  invalid: number
  inserted_ids: string[]
}

export interface SignInSubmitInput {
  first_name: string
  last_name: string
  phone: string
  email?: string | null
}

export interface QueueMessagesInput {
  pnm_ids: string[]
  body: string
}

export interface CastVoteInput {
  pnm_id: string
  decision: VoteDecision
}

export interface StartVotingInput {
  pnm_order: string[]
}

// ------------------------------------------------------------------
// Stats DTOs
// ------------------------------------------------------------------

export interface StatsOverview {
  total_pnms: number
  events_this_week: number
  avg_attendance: number
  yes_rated: number
  pending: number
  invited: number
  accepted: number
  rejected: number
}

export interface AttendanceByType {
  type: EventType
  attendance: number
  events: number
}

export interface PnmGrowthPoint {
  date: string // YYYY-MM-DD
  count: number
  cumulative: number
}

// ------------------------------------------------------------------
// Preload bridge / system types
// ------------------------------------------------------------------

export interface ServerInfo {
  port: number
  baseUrl: string // http://127.0.0.1:<port>
  lanUrl: string // http://<lan-ip>:<port>  (for QR codes on phones)
  lanIp: string
  version: string
  platform: NodeJS.Platform
}

export type UpdateStatus =
  | { state: 'checking' }
  | { state: 'available'; version: string; notes?: string | null }
  | { state: 'not-available'; version: string }
  | { state: 'downloading'; percent: number; transferred: number; total: number; bytesPerSecond: number }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; message: string }
  | { state: 'idle' }
