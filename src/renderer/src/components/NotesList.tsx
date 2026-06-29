import { Trash2 } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { EmptyState } from '@/components/ui/EmptyState'
import { MessageSquare } from 'lucide-react'
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
        <div key={n.id} className="rounded-xl border border-white/5 bg-ink-950/40 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-semibold text-gold-300">{n.author_name}</span>
            <span className="flex items-center gap-2 text-xs text-ink-400">
              {formatDateTime(n.created_at)}
              {(n.author_id === currentUserId || isAdmin) && onDelete && (
                <button
                  onClick={() => onDelete(n.id)}
                  className="text-ink-400 transition hover:text-garnet-300"
                  title="Delete note"
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
