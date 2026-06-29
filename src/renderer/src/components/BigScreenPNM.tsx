import { Avatar } from '@/components/ui/Avatar'
import { VoteTally } from '@/components/VoteTally'
import { formatPhone } from '@/lib/utils'
import type { Pnm } from '@shared/types'

export function BigScreenPNM({
  pnm,
  tally,
  revealed,
  index,
  total,
  eventCount,
  notes
}: {
  pnm: Pnm
  tally: { yes: number; no: number; abstain: number; total: number }
  revealed: boolean
  index: number
  total: number
  eventCount?: number
  notes?: string[]
}): JSX.Element {
  return (
    <div className="flex h-full w-full animate-fade-in flex-col items-center justify-center gap-8 px-12">
      <div className="text-sm font-semibold uppercase tracking-[0.3em] text-gold-500">
        PNM {index + 1} of {total}
      </div>
      <Avatar
        photo={pnm.photo_url}
        first={pnm.first_name}
        last={pnm.last_name}
        size={260}
        className="shadow-glow ring-4 ring-gold-500/40"
      />
      <div className="text-center">
        <h1 className="font-display text-6xl font-bold text-ink-50">
          {pnm.first_name} {pnm.last_name}
        </h1>
        <p className="mt-2 text-2xl text-ink-300">{formatPhone(pnm.phone)}</p>
        {eventCount !== undefined && (
          <p className="mt-1 text-lg text-gold-400">{eventCount} events attended</p>
        )}
      </div>
      {notes && notes.length > 0 && (
        <div className="max-w-3xl text-center text-lg italic text-ink-300">
          “{notes[0]}”
        </div>
      )}
      <div className="w-full max-w-3xl">
        <VoteTally tally={tally} revealed={revealed} size="lg" />
      </div>
    </div>
  )
}
