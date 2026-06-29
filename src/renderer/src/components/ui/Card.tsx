import { cn } from '@/lib/utils'

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div className={cn('card p-5 transition duration-200', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
}): JSX.Element {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-base font-semibold leading-tight text-ink-50">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-ink-400">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
