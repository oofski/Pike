import { cn } from '@/lib/utils'

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  className
}: {
  checked: boolean
  onChange: (b: boolean) => void
  label?: string
  disabled?: boolean
  className?: string
}): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'group inline-flex select-none items-center gap-2.5 text-sm font-medium text-ink-100 outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-white/10 transition group-focus-visible:ring-2 group-focus-visible:ring-gold-500/40',
          checked ? 'bg-gradient-to-br from-gold-500 to-gold-400 shadow-glow' : 'bg-ink-700'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-[22px]' : 'translate-x-1'
          )}
        />
      </span>
      {label && <span>{label}</span>}
    </button>
  )
}
