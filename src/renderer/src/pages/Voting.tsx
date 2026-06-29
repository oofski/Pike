import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Check,
  X,
  Monitor,
  Square,
  Search,
  Vote as VoteIcon
} from 'lucide-react'
import { api } from '@/lib/api'
import { qk } from '@/lib/queryKeys'
import { useAuth } from '@/stores/auth'
import { useVotingSession } from '@/hooks/useVotingSession'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { VoteTally } from '@/components/VoteTally'
import { StatusBadge } from '@/components/StatusBadge'
import { cn, formatPhone } from '@/lib/utils'

export default function VotingPage(): JSX.Element {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { can } = useAuth()

  // Brothers don't manage sessions — send them to the voting view.
  useEffect(() => {
    if (!can('rush_chair', 'admin')) navigate('/vote', { replace: true })
  }, [can, navigate])

  const session = useVotingSession()
  const invalidate = (): void => void qc.invalidateQueries({ queryKey: qk.votingSession })

  if (session.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return session.data?.active ? (
    <ActiveSession data={session.data} onChanged={invalidate} navigate={navigate} />
  ) : (
    <SetupSession />
  )
}

// ------------------------------------------------------------------
// Setup — choose order and start
// ------------------------------------------------------------------
function SetupSession(): JSX.Element {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const pnms = useQuery({ queryKey: qk.pnms({ sort: 'name' }), queryFn: () => api.pnms.list({ sort: 'name' }) })

  const start = useMutation({
    mutationFn: () => api.voting.start(selected),
    onSuccess: () => {
      toast.success('Voting session started')
      qc.invalidateQueries({ queryKey: qk.votingSession })
    },
    onError: (e: Error) => toast.error(e.message)
  })

  const toggle = (id: string): void =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const list = (pnms.data || []).filter((p) =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-50">Bid Room</h1>
        <p className="text-sm text-ink-400">Pick the PNMs to review, then start the session for the chapter.</p>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardHeader title="Select PNMs to review" subtitle={`${selected.length} selected · reviewed in the order you pick`} />
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected((pnms.data || []).map((p) => p.id))}
              disabled={!pnms.data?.length}
            >
              Select all
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])} disabled={!selected.length}>
              Clear
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Search PNMs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {pnms.isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner />
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon={VoteIcon} title="No PNMs to review" description="Add some PNMs before starting a vote." />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => {
              const idx = selected.indexOf(p.id)
              const checked = idx >= 0
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-2.5 text-left transition',
                    checked
                      ? 'border-gold-500/50 bg-gold-500/10'
                      : 'border-white/5 bg-ink-950/40 hover:border-white/10'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold',
                      checked ? 'bg-gold-500 text-ink-950' : 'border border-ink-700 text-transparent'
                    )}
                  >
                    {checked ? idx + 1 : ''}
                  </div>
                  <Avatar photo={p.photo_url} first={p.first_name} last={p.last_name} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink-50">
                      {p.first_name} {p.last_name}
                    </div>
                    <div className="text-xs text-ink-400">{p.event_count} events</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div className="flex justify-end border-t border-white/5 pt-4">
          <Button onClick={() => start.mutate()} disabled={!selected.length || start.isPending}>
            <VoteIcon size={16} />
            {start.isPending ? 'Starting…' : `Start Voting Session (${selected.length})`}
          </Button>
        </div>
      </Card>
    </div>
  )
}

// ------------------------------------------------------------------
// Active — control the live session
// ------------------------------------------------------------------
function ActiveSession({
  data,
  onChanged,
  navigate
}: {
  data: NonNullable<ReturnType<typeof useVotingSession>['data']>
  onChanged: () => void
  navigate: ReturnType<typeof useNavigate>
}): JSX.Element {
  const pnm = data.current_pnm
  const revealed = !!data.results_revealed
  const tally = data.tally || { yes: 0, no: 0, abstain: 0, total: 0 }
  const index = data.index ?? 0
  const total = data.order?.length ?? 0

  const advance = useMutation({
    mutationFn: (direction: 'next' | 'prev') => api.voting.advance({ direction }),
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message)
  })
  const reveal = useMutation({
    mutationFn: (v: boolean) => api.voting.reveal(v),
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message)
  })
  const decide = useMutation({
    mutationFn: (status: 'accepted' | 'rejected') => api.voting.decide(status, pnm?.id),
    onSuccess: (_d, status) => {
      toast.success(status === 'accepted' ? 'Marked accepted' : 'Marked rejected')
      onChanged()
    },
    onError: (e: Error) => toast.error(e.message)
  })
  const end = useMutation({
    mutationFn: () => api.voting.end(),
    onSuccess: () => {
      toast.success('Voting session ended')
      onChanged()
    },
    onError: (e: Error) => toast.error(e.message)
  })

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-50">Bid Room — Live</h1>
          <p className="text-sm text-ink-400">
            Reviewing PNM {index + 1} of {total} · brothers vote on their phones
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="gold" onClick={() => navigate('/voting/present')}>
            <Monitor size={16} /> Open Big Screen
          </Button>
          <Button variant="danger" onClick={() => end.mutate()} disabled={end.isPending}>
            <Square size={16} /> End Session
          </Button>
        </div>
      </div>

      {!pnm ? (
        <Card>
          <EmptyState icon={VoteIcon} title="No PNM selected" description="Advance to the next PNM to begin." />
        </Card>
      ) : (
        <Card className="space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Avatar
              photo={pnm.photo_url}
              first={pnm.first_name}
              last={pnm.last_name}
              size={140}
              className="ring-4 ring-gold-500/20"
            />
            <div>
              <h2 className="font-display text-3xl font-bold text-ink-50">
                {pnm.first_name} {pnm.last_name}
              </h2>
              <p className="text-sm text-ink-300">{formatPhone(pnm.phone)}</p>
              <div className="mt-2">
                <StatusBadge status={pnm.status} />
              </div>
            </div>
          </div>

          <VoteTally tally={tally} revealed={revealed} />
          <p className="text-center text-xs text-ink-400">
            {tally.total} vote{tally.total === 1 ? '' : 's'} cast
            {!revealed && ' · results hidden until revealed'}
          </p>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/5 pt-5">
            <Button
              variant="ghost"
              onClick={() => advance.mutate('prev')}
              disabled={advance.isPending || index <= 0}
            >
              <ChevronLeft size={16} /> Previous
            </Button>
            <Button
              variant={revealed ? 'ghost' : 'gold'}
              onClick={() => reveal.mutate(!revealed)}
              disabled={reveal.isPending}
            >
              {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
              {revealed ? 'Hide Results' : 'Reveal Results'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => advance.mutate('next')}
              disabled={advance.isPending || index >= total - 1}
            >
              Next <ChevronRight size={16} />
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              onClick={() => decide.mutate('accepted')}
              disabled={decide.isPending}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              <Check size={16} /> Mark Accepted
            </Button>
            <Button variant="danger" onClick={() => decide.mutate('rejected')} disabled={decide.isPending}>
              <X size={16} /> Mark Rejected
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
