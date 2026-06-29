export const qk = {
  me: ['me'] as const,
  users: ['users'] as const,
  events: ['events'] as const,
  event: (id: string) => ['events', id] as const,
  eventAttendees: (id: string) => ['events', id, 'attendees'] as const,
  pnms: (params?: Record<string, string>) => ['pnms', params || {}] as const,
  pnm: (id: string) => ['pnms', id] as const,
  pnmEvents: (id: string) => ['pnms', id, 'events'] as const,
  pnmNotes: (id: string) => ['pnms', id, 'notes'] as const,
  signinSessions: ['signin-sessions'] as const,
  votingSession: ['voting', 'session'] as const,
  messages: (status?: string) => ['messages', status || 'all'] as const,
  campaigns: ['messages', 'campaigns'] as const,
  statsOverview: ['stats', 'overview'] as const,
  statsAttendance: ['stats', 'attendance'] as const,
  statsGrowth: ['stats', 'growth'] as const,
  bridgeKey: ['bridge-key'] as const
}
