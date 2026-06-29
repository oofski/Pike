import { Badge } from '@/components/ui/Badge'
import { EVENT_TYPE_META } from '@shared/branding'
import { cn } from '@/lib/utils'
import type { EventType } from '@shared/types'

export function EventBadge({ type, className }: { type: EventType; className?: string }): JSX.Element {
  const meta = EVENT_TYPE_META[type]
  return (
    <Badge className={cn('ring-1 ring-inset ring-white/10', meta.bg, meta.text, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </Badge>
  )
}
