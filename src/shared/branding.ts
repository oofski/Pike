// PIKE — Pi Kappa Alpha, Sigma Chapter at Vanderbilt University.
// Central branding constants used across the app.

import type { EventType, PnmStatus, Rating } from './types'

export const BRAND = {
  org: 'Pi Kappa Alpha',
  greek: 'ΠΚΑ',
  chapter: 'Sigma Chapter',
  school: 'Vanderbilt University',
  appName: 'PIKE Rush',
  tagline: 'Sigma Chapter · Vanderbilt',
  fullName: 'PIKE Rush — Sigma Chapter, Vanderbilt',
  motto: 'Once a Pike, Always a Pike',
  colors: {
    garnet: '#7b1113',
    gold: '#c9a227'
  }
} as const

export const EVENT_TYPE_META: Record<
  EventType,
  { label: string; color: string; bg: string; text: string; dot: string; calendar: string }
> = {
  bar_tab: {
    label: 'Bar Tab',
    color: 'purple',
    bg: 'bg-purple-500/15',
    text: 'text-purple-300',
    dot: 'bg-purple-400',
    calendar: '#a855f7'
  },
  date_party: {
    label: 'Date Party',
    color: 'pink',
    bg: 'bg-pink-500/15',
    text: 'text-pink-300',
    dot: 'bg-pink-400',
    calendar: '#ec4899'
  },
  pong_night: {
    label: 'Pong Night',
    color: 'green',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400',
    calendar: '#22c55e'
  },
  social: {
    label: 'Social',
    color: 'blue',
    bg: 'bg-blue-500/15',
    text: 'text-blue-300',
    dot: 'bg-blue-400',
    calendar: '#3b82f6'
  },
  info_night: {
    label: 'Info Night',
    color: 'orange',
    bg: 'bg-orange-500/15',
    text: 'text-orange-300',
    dot: 'bg-orange-400',
    calendar: '#f97316'
  },
  other: {
    label: 'Other',
    color: 'gray',
    bg: 'bg-slate-500/15',
    text: 'text-slate-300',
    dot: 'bg-slate-400',
    calendar: '#94a3b8'
  }
}

export const STATUS_META: Record<
  PnmStatus,
  { label: string; bg: string; text: string }
> = {
  pending: { label: 'Pending', bg: 'bg-slate-500/15', text: 'text-slate-300' },
  invited: { label: 'Invited', bg: 'bg-gold-500/15', text: 'text-gold-300' },
  accepted: { label: 'Accepted', bg: 'bg-emerald-500/15', text: 'text-emerald-300' },
  rejected: { label: 'Rejected', bg: 'bg-garnet-500/20', text: 'text-garnet-200' }
}

export const RATING_META: Record<Rating, { label: string; emoji: string; text: string }> = {
  yes: { label: 'Yes', emoji: '★★★', text: 'text-emerald-400' },
  maybe: { label: 'Maybe', emoji: '★★', text: 'text-gold-400' },
  no: { label: 'No', emoji: '★', text: 'text-garnet-300' }
}

export const EVENT_TYPES: EventType[] = [
  'bar_tab',
  'date_party',
  'pong_night',
  'social',
  'info_night',
  'other'
]

export const PNM_STATUSES: PnmStatus[] = ['pending', 'invited', 'accepted', 'rejected']
export const RATINGS: Rating[] = ['yes', 'maybe', 'no']
