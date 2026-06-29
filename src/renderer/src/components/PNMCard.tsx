import { Avatar } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/StatusBadge'
import { RATING_META } from '@shared/branding'
import { formatPhone } from '@/lib/utils'
import { CalendarCheck } from 'lucide-react'
import type { PnmWithStats } from '@shared/types'

export function PNMCard({ pnm, onClick }: { pnm: PnmWithStats; onClick?: () => void }): JSX.Element {
  const rating = RATING_META[pnm.internal_rating]
  return (
    <button
      onClick={onClick}
      className="card group flex flex-col items-center gap-2 p-5 text-center outline-none transition duration-200 hover:-translate-y-0.5 hover:border-gold-500/40 hover:shadow-glow focus-visible:border-gold-500/40 focus-visible:ring-2 focus-visible:ring-gold-500/30"
    >
      <Avatar
        photo={pnm.photo_url}
        first={pnm.first_name}
        last={pnm.last_name}
        size={80}
        className="transition group-hover:ring-gold-500/40"
      />
      <div className="mt-1 font-semibold text-ink-50">
        {pnm.first_name} {pnm.last_name}
      </div>
      <div className="text-sm text-ink-400">{formatPhone(pnm.phone)}</div>
      <div className={`text-sm font-semibold ${rating.text}`}>
        {rating.emoji} {rating.label}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-ink-400">
        <CalendarCheck size={13} />
        {pnm.event_count} event{pnm.event_count === 1 ? '' : 's'} attended
      </div>
      <div className="mt-1">
        <StatusBadge status={pnm.status} />
      </div>
    </button>
  )
}
