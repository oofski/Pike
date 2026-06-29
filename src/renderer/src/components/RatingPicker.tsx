import { RATINGS, RATING_META } from '@shared/branding'
import { cn } from '@/lib/utils'
import type { Rating } from '@shared/types'

export function RatingPicker({
  value,
  onChange,
  readOnly,
  size = 'md'
}: {
  value: Rating
  onChange?: (r: Rating) => void
  readOnly?: boolean
  size?: 'sm' | 'md'
}): JSX.Element {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-ink-700">
      {RATINGS.map((r) => {
        const active = value === r
        return (
          <button
            key={r}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(r)}
            className={cn(
              'font-semibold transition',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              active
                ? r === 'yes'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : r === 'maybe'
                    ? 'bg-gold-500/20 text-gold-300'
                    : 'bg-garnet-500/25 text-garnet-200'
                : 'text-ink-400 hover:bg-white/5',
              readOnly && 'cursor-default'
            )}
          >
            {RATING_META[r].label}
          </button>
        )
      })}
    </div>
  )
}
