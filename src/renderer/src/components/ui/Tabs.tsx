import { cn } from '@/lib/utils'

export function Tabs({
  tabs,
  active,
  onChange,
  className
}: {
  tabs: { key: string; label: string; count?: number }[]
  active: string
  onChange: (key: string) => void
  className?: string
}): JSX.Element {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        'flex items-center gap-1 overflow-x-auto border-b border-white/5',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.key)}
            className={cn(
              'group relative -mb-px inline-flex items-center gap-2 whitespace-nowrap rounded-t-lg px-3.5 py-2.5 text-sm font-semibold outline-none transition focus-visible:ring-1 focus-visible:ring-gold-500/40',
              isActive
                ? 'text-gold-300'
                : 'text-ink-400 hover:text-ink-100'
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none tabular-nums transition',
                  isActive
                    ? 'bg-gold-500/15 text-gold-300'
                    : 'bg-white/5 text-ink-400 group-hover:text-ink-200'
                )}
              >
                {tab.count}
              </span>
            )}
            <span
              aria-hidden
              className={cn(
                'absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-gold-500 to-gold-300 transition-opacity',
                isActive ? 'opacity-100' : 'opacity-0'
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
