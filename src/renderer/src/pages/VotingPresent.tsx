import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Vote as VoteIcon } from 'lucide-react'
import { useVotingSession } from '@/hooks/useVotingSession'
import { Spinner } from '@/components/ui/Spinner'
import { BigScreenPNM } from '@/components/BigScreenPNM'
import { BRAND } from '@shared/branding'

export default function VotingPresentPage(): JSX.Element {
  const navigate = useNavigate()
  const session = useVotingSession()

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') navigate('/voting')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const data = session.data
  const active = data?.active && data.current_pnm
  const tally = data?.tally || { yes: 0, no: 0, abstain: 0, total: 0 }

  return (
    <div className="app-bg relative flex h-screen w-screen flex-col overflow-hidden">
      <button
        onClick={() => navigate('/voting')}
        className="absolute right-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-950/60 px-3 py-1.5 text-sm font-medium text-ink-300 opacity-40 transition hover:opacity-100"
        title="Exit big screen (Esc)"
      >
        <X size={15} /> Exit
      </button>

      {/* Wordmark */}
      <div className="absolute left-6 top-6 z-10 flex items-center gap-3 opacity-70">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-500 to-gold-300 font-display text-lg font-bold text-ink-950">
          {BRAND.greek}
        </div>
        <div>
          <div className="text-sm font-bold leading-none text-ink-50">{BRAND.appName}</div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-gold-500">Bid Room</div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center">
        {session.isLoading ? (
          <Spinner className="h-10 w-10" />
        ) : active && data?.current_pnm ? (
          <BigScreenPNM
            pnm={data.current_pnm}
            tally={tally}
            revealed={!!data.results_revealed}
            index={data.index ?? 0}
            total={data.order?.length ?? 0}
          />
        ) : (
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gold-500/10 text-gold-500">
              <VoteIcon size={44} />
            </div>
            <div>
              <h1 className="font-display text-5xl font-bold text-ink-50">Bid Room</h1>
              <p className="mt-3 text-xl text-ink-400">Waiting for the rush chair to start a voting session…</p>
            </div>
            <p className="text-sm uppercase tracking-[0.3em] text-gold-500/70">{BRAND.tagline}</p>
          </div>
        )}
      </div>
    </div>
  )
}
