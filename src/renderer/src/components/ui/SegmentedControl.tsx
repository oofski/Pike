import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SegmentedControl({
  options,
  value,
  onChange,
  className
}: {
  options: { value: string; label: string; icon?: LucideIcon }[]
  value: string
  onChange: (v: string) => void
  className?: string
}): JSX.Element {
  return (
    <div
      role="radiogroup"
      className={cn(
        'inline-flex items-center gap-1 rounded-xl border border-ink-700 bg-ink-950/60 p-1',
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none transition focus-visible:ring-1 focus-visible:ring-gold-500/40',
              isActive
                ? 'bg-gradient-to-br from-garnet-600 to-garnet-500 text-gold-100 shadow-glow'
                : 'text-ink-400 hover:bg-white/5 hover:text-ink-100'
            )}
          >
            {Icon && <Icon size={15} className={cn(isActive ? 'text-gold-300' : 'text-ink-400')} />}
            <span>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
