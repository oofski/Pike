import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, X, Minus, Vote as VoteIcon, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { qk } from '@/lib/queryKeys'
import { useVotingSession } from '@/hooks/useVotingSession'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn, formatPhone } from '@/lib/utils'
import type { VoteDecision } from '@shared/types'

const CHOICES: { decision: VoteDecision; label: string; icon: typeof Check; active: string }[] = [
  { decision: 'yes', label: 'Yes', icon: Check, active: 'border-emerald-500 bg-emerald-500/15 text-emerald-300' },
  { decision: 'no', label: 'No', icon: X, active: 'border-garnet-500 bg-garnet-500/20 text-garnet-200' },
  { decision: 'abstain', label: 'Abstain', icon: Minus, active: 'border-ink-500 bg-white/10 text-ink-200' }
]

export default function VotePage(): JSX.Element {
  const qc = useQueryClient()
  const session = useVotingSession()
  const data = session.data
  const pnm = data?.active ? data.current_pnm : null

  // Track which PNM the local optimistic choice belongs to so it resets on advance.
  const [localVote, setLocalVote] = useState<{ pnmId: string; decision: VoteDecision } | null>(null)

  useEffect(() => {
    if (localVote && pnm && localVote.pnmId !== pnm.id) setLocalVote(null)
  }, [pnm, localVote])

  const myVote: VoteDecision | null =
    localVote && pnm && localVote.pnmId === pnm.id ? localVote.decision : data?.my_vote ?? null

  const cast = useMutation({
    mutationFn: ({ pnmId, decision }: { pnmId: string; decision: VoteDecision }) =>
      api.voting.castVote(pnmId, decision),
    onMutate: ({ pnmId, decision }) => setLocalVote({ pnmId, decision }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.votingSession })
      toast.success('Vote recorded')
    },
    onError: (e: Error) => {
      setLocalVote(null)
      toast.error(e.message)
    }
  })

  if (session.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!pnm) {
    return (
      <div className="animate-fade-in space-y-6">
        <h1 className="font-display text-3xl font-bold text-ink-50">Vote</h1>
        <Card>
          <EmptyState
            icon={VoteIcon}
            title="No active vote right now"
            description="When the rush chair starts a session, the current PNM will appear here for you to vote on."
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="animate-fade-in mx-auto max-w-md space-y-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-500">
          PNM {(data?.index ?? 0) + 1} of {data?.order?.length ?? 0}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink-50">Cast your vote</h1>
      </div>

      <Card className="flex flex-col items-center gap-3 text-center">
        <Avatar
          photo={pnm.photo_url}
          first={pnm.first_name}
          last={pnm.last_name}
          size={120}
          className="ring-4 ring-gold-500/20"
        />
        <div>
          <h2 className="font-display text-2xl font-bold text-ink-50">
            {pnm.first_name} {pnm.last_name}
          </h2>
          <p className="text-sm text-ink-300">{formatPhone(pnm.phone)}</p>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        {CHOICES.map((c) => {
          const selected = myVote === c.decision
          const Icon = c.icon
          return (
            <button
              key={c.decision}
              onClick={() => cast.mutate({ pnmId: pnm.id, decision: c.decision })}
              disabled={cast.isPending}
              className={cn(
                'flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 font-semibold transition disabled:opacity-60',
                selected ? c.active : 'border-ink-700 bg-ink-900/60 text-ink-300 hover:border-ink-500'
              )}
            >
              <Icon size={32} />
              <span className="text-base">{c.label}</span>
            </button>
          )
        })}
      </div>

      {myVote && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-2.5 text-sm font-medium text-emerald-300">
          <CheckCircle2 size={16} />
          Vote recorded — you can change it until the next PNM
        </div>
      )}
    </div>
  )
}
