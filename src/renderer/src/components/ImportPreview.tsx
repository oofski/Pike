import { cn } from '@/lib/utils'

export type ImportRowStatus = 'new' | 'duplicate' | 'invalid'

export interface ImportRow {
  first_name: string
  last_name: string
  phone: string
  email?: string
  status: ImportRowStatus
  reason?: string
}

const meta: Record<ImportRowStatus, { dot: string; label: string; text: string }> = {
  new: { dot: 'bg-emerald-400', label: 'New', text: 'text-emerald-300' },
  duplicate: { dot: 'bg-gold-400', label: 'Duplicate', text: 'text-gold-300' },
  invalid: { dot: 'bg-garnet-400', label: 'Invalid', text: 'text-garnet-300' }
}

export function ImportPreview({ rows }: { rows: ImportRow[] }): JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border border-white/5">
      <table className="w-full text-left text-sm">
        <thead className="bg-ink-950/60 text-xs uppercase tracking-wide text-ink-400">
          <tr>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">First</th>
            <th className="px-4 py-2.5">Last</th>
            <th className="px-4 py-2.5">Phone</th>
            <th className="px-4 py-2.5">Note</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((r, i) => {
            const m = meta[r.status]
            return (
              <tr
                key={i}
                className={cn(
                  'transition-colors',
                  r.status === 'new' && 'bg-emerald-500/5 hover:bg-emerald-500/10',
                  r.status === 'duplicate' && 'bg-gold-500/5 hover:bg-gold-500/10',
                  r.status === 'invalid' && 'bg-garnet-500/5 hover:bg-garnet-500/10'
                )}
              >
                <td className="px-4 py-2">
                  <span className={cn('inline-flex items-center gap-1.5 font-medium', m.text)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />
                    {m.label}
                  </span>
                </td>
                <td className="px-4 py-2 text-ink-100">{r.first_name}</td>
                <td className="px-4 py-2 text-ink-100">{r.last_name}</td>
                <td className="px-4 py-2 text-ink-300">{r.phone}</td>
                <td className="px-4 py-2 text-xs text-ink-400">{r.reason || ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
