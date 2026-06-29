import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, MessageSquareText } from 'lucide-react'
import { api } from '@/lib/api'
import { qk } from '@/lib/queryKeys'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateTime } from '@/lib/utils'

export default function TextingHistoryPage(): JSX.Element {
  const navigate = useNavigate()
  const campaigns = useQuery({ queryKey: qk.campaigns, queryFn: api.messages.campaigns })

  return (
    <div className="animate-fade-in space-y-6">
      <button
        onClick={() => navigate('/texting')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-300 transition hover:text-gold-300"
      >
        <ArrowLeft size={16} /> Back to Texting
      </button>

      <div>
        <h1 className="font-display text-3xl font-bold text-ink-50">Message History</h1>
        <p className="text-sm text-ink-400">Every text blast you&apos;ve queued and its delivery status.</p>
      </div>

      {campaigns.isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : !campaigns.data || campaigns.data.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="No campaigns yet"
          description="When you queue a text blast it will show up here with sent, failed, and pending counts."
          action={<Button onClick={() => navigate('/texting')}>Compose a message</Button>}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/5 bg-ink-950/40 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3 text-right">Recipients</th>
                <th className="px-4 py-3 text-right">Sent</th>
                <th className="px-4 py-3 text-right">Failed</th>
                <th className="px-4 py-3 text-right">Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {campaigns.data.map((c) => (
                <tr key={c.batch_id} className="transition hover:bg-white/5">
                  <td className="whitespace-nowrap px-4 py-3 text-ink-300">{formatDateTime(c.created_at)}</td>
                  <td className="max-w-sm px-4 py-3 text-ink-100">
                    <span className="line-clamp-2">{c.body_preview}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-200">{c.recipients}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-emerald-400">{c.sent}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-medium ${c.failed ? 'text-garnet-300' : 'text-ink-400'}`}>
                    {c.failed}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums font-medium ${c.pending ? 'text-gold-300' : 'text-ink-400'}`}>
                    {c.pending}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
