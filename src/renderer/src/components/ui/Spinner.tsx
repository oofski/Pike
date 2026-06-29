import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }): JSX.Element {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'h-6 w-6 animate-spin rounded-full border-2 border-gold-500/30 border-t-gold-500',
        className
      )}
    />
  )
}
