import { Trash2, MessageSquare } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { EmptyState } from '@/components/ui/EmptyState'
import type { PnmNote } from '@shared/types'

export function NotesList({
  notes,
  currentUserId,
  isAdmin,
  onDelete
}: {
  notes: PnmNote[]
  currentUserId: string
  isAdmin?: boolean
  onDelete?: (noteId: string) => void
}): JSX.Element {
  if (!notes.length) {
    return <EmptyState icon={MessageSquare} title="No notes yet" description="Be the first brother to leave a note." />
  }
  return (
    <div className="space-y-3">
      {notes.map((n) => (
        <div
          key={n.id}
          className="group rounded-xl border border-white/5 bg-ink-950/40 p-3 transition hover:border-white/10 hover:bg-ink-950/60"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-gold-300">{n.author_name}</span>
            <span className="flex items-center gap-2 text-xs text-ink-400">
              {formatDateTime(n.created_at)}
              {(n.author_id === currentUserId || isAdmin) && onDelete && (
                <button
                  onClick={() => onDelete(n.id)}
                  className="rounded p-0.5 text-ink-400 outline-none transition hover:text-garnet-300 focus-visible:ring-1 focus-visible:ring-garnet-400/50"
                  title="Delete note"
                  aria-label="Delete note"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-ink-100">{n.content}</p>
        </div>
      ))}
    </div>
  )
}
