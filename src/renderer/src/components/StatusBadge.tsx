import { Badge } from '@/components/ui/Badge'
import { STATUS_META } from '@shared/branding'
import { cn } from '@/lib/utils'
import type { PnmStatus } from '@shared/types'

export function StatusBadge({ status, className }: { status: PnmStatus; className?: string }): JSX.Element {
  const meta = STATUS_META[status]
  return <Badge className={cn(meta.bg, meta.text, className)}>{meta.label}</Badge>
}
