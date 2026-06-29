import { cn } from '@/lib/utils'

export function Badge({
  className,
  children
}: {
  className?: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        className
      )}
    >
      {children}
    </span>
  )
}
