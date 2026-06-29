import { cn } from '@/lib/utils'

export function VoteTally({
  tally,
  revealed = true,
  size = 'md'
}: {
  tally: { yes: number; no: number; abstain: number; total: number }
  revealed?: boolean
  size?: 'md' | 'lg'
}): JSX.Element {
  const big = size === 'lg'
  const cells = [
    { label: 'Yes', value: tally.yes, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'No', value: tally.no, color: 'text-garnet-300', bg: 'bg-garnet-500/15' },
    { label: 'Abstain', value: tally.abstain, color: 'text-ink-300', bg: 'bg-white/5' }
  ]
  return (
    <div className={cn('grid grid-cols-3 gap-3', big && 'gap-6')}>
      {cells.map((c) => (
        <div key={c.label} className={cn('rounded-2xl text-center', c.bg, big ? 'px-8 py-6' : 'px-4 py-3')}>
          <div className={cn('font-bold tabular-nums', c.color, big ? 'text-6xl' : 'text-2xl')}>
            {revealed ? c.value : '—'}
          </div>
          <div className={cn('mt-1 font-medium uppercase tracking-wide text-ink-400', big ? 'text-sm' : 'text-xs')}>
            {c.label}
          </div>
        </div>
      ))}
    </div>
  )
}
