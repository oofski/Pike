import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  accent = 'gold'
}: {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  hint?: string
  accent?: 'gold' | 'garnet' | 'emerald' | 'blue'
}): JSX.Element {
  const accents: Record<string, string> = {
    gold: 'text-gold-400 bg-gold-500/10',
    garnet: 'text-garnet-300 bg-garnet-500/15',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    blue: 'text-blue-400 bg-blue-500/10'
  }
  return (
    <div className="card flex items-center gap-4 p-5">
      {Icon && (
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', accents[accent])}>
          <Icon size={22} />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-2xl font-bold leading-none text-ink-50">{value}</div>
        <div className="mt-1 truncate text-sm text-ink-400">{label}</div>
        {hint && <div className="text-xs text-ink-400/70">{hint}</div>}
      </div>
    </div>
  )
}
