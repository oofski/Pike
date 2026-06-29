import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Send, History, Info, Users, Filter, CalendarDays, MousePointerClick } from 'lucide-react'
import { api } from '@/lib/api'
import { qk } from '@/lib/queryKeys'
import { useAuth } from '@/stores/auth'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea, Select } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Avatar } from '@/components/ui/Avatar'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatusBadge } from '@/components/StatusBadge'
import { PNM_STATUSES, STATUS_META } from '@shared/branding'
import { cn, formatPhone } from '@/lib/utils'

type Mode = 'all' | 'status' | 'event' | 'manual'

export default function TextingPage(): JSX.Element {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { can } = useAuth()

  useEffect(() => {
    if (!can('rush_chair', 'admin')) navigate('/dashboard', { replace: true })
  }, [can, navigate])

  const [mode, setMode] = useState<Mode>('all')
  const [status, setStatus] = useState('pending')
  const [eventId, setEventId] = useState('')
  const [manual, setManual] = useState<string[]>([])
  const [body, setBody] = useState('')

  const events = useQuery({ queryKey: qk.events, queryFn: api.events.list })

  const params = useMemo(() => {
    const p: Record<string, string> = {}
    if (mode === 'status' && status) p.status = status
    if (mode === 'event' && eventId) p.event_id = eventId
    return p
  }, [mode, status, eventId])

  const pnms = useQuery({ queryKey: qk.pnms(params), queryFn: () => api.pnms.list(params) })

  const candidates = pnms.data || []
  const recipientIds = mode === 'manual' ? manual : candidates.map((p) => p.id)

  const toggleManual = (id: string): void =>
    setManual((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const queue = useMutation({
    mutationFn: () => api.messages.queue(recipientIds, body.trim()),
    onSuccess: (res) => {
      toast.success(`Queued ${res.queued} message${res.queued === 1 ? '' : 's'} — start the Mac bridge to send`)
      setBody('')
      setManual([])
      qc.invalidateQueries({ queryKey: qk.campaigns })
    },
    onError: (e: Error) => toast.error(e.message)
  })

  const count = recipientIds.length

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-50">Mass Texting</h1>
          <p className="text-sm text-ink-400">Compose a blast, queue it, then send from the Mac bridge.</p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/texting/history')}>
          <History size={16} /> History
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recipients */}
        <Card className="space-y-4 lg:col-span-2">
          <CardHeader title="Recipients" subtitle="Choose who gets this message" />
          <SegmentedControl
            options={[
              { value: 'all', label: 'All', icon: <Users size={14} /> },
              { value: 'status', label: 'By Status', icon: <Filter size={14} /> },
              { value: 'event', label: 'By Event', icon: <CalendarDays size={14} /> },
              { value: 'manual', label: 'Manual', icon: <MousePointerClick size={14} /> }
            ]}
            value={mode}
            onChange={(v) => setMode(v as Mode)}
          />

          {mode === 'status' && (
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {PNM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </Select>
          )}
          {mode === 'event' && (
            <Select label="Event attended" value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">Select an event…</option>
              {events.data?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </Select>
          )}

          {pnms.isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Spinner />
            </div>
          ) : candidates.length === 0 ? (
            <EmptyState icon={Users} title="No matching PNMs" description="Adjust your filter to find recipients." />
          ) : mode === 'manual' ? (
            <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {candidates.map((p) => {
                const checked = manual.includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleManual(p.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition',
                      checked ? 'border-gold-500/50 bg-gold-500/10' : 'border-white/5 bg-ink-950/40 hover:border-white/10'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold',
                        checked ? 'bg-gold-500 text-ink-950' : 'border border-ink-700'
                      )}
                    >
                      {checked ? '✓' : ''}
                    </div>
                    <Avatar photo={p.photo_url} first={p.first_name} last={p.last_name} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink-50">
                        {p.first_name} {p.last_name}
                      </div>
                      <div className="text-xs text-ink-400">{formatPhone(p.phone)}</div>
                    </div>
                    <StatusBadge status={p.status} />
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-white/5 bg-ink-950/40 p-4 text-sm text-ink-300">
              <span className="font-semibold text-gold-300">{candidates.length}</span> PNM
              {candidates.length === 1 ? '' : 's'} match this selection.
            </div>
          )}
        </Card>

        {/* Compose */}
        <div className="space-y-6">
          <Card className="space-y-3">
            <CardHeader title="Message" />
            <Textarea
              placeholder="Hey {{name}} — pong night at the house tonight at 9. Come through! 🤙"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
            />
            <div className="flex items-center justify-between text-xs text-ink-400">
              <span>{body.length} characters</span>
              <span>~{Math.max(1, Math.ceil(body.length / 160))} segment(s)</span>
            </div>

            <div className="rounded-xl border border-gold-500/20 bg-gold-500/5 p-3 text-center text-sm">
              <span className="text-ink-300">Will be sent to </span>
              <span className="font-bold text-gold-300">{count}</span>
              <span className="text-ink-300"> recipient{count === 1 ? '' : 's'}</span>
            </div>

            <Button
              className="w-full"
              onClick={() => queue.mutate()}
              disabled={!body.trim() || count === 0 || queue.isPending}
            >
              <Send size={16} /> {queue.isPending ? 'Queueing…' : 'Queue Messages'}
            </Button>
          </Card>

          <Card className="space-y-2 text-sm text-ink-300">
            <div className="flex items-center gap-2 font-semibold text-ink-100">
              <Info size={15} className="text-gold-500" /> About the Mac bridge
            </div>
            <p className="text-xs leading-relaxed text-ink-400">
              Queued messages sit in a pending queue. The designated rush chair runs the small Mac bridge script on a Mac
              signed in to iMessage — it polls this app and sends each text via Messages.app, one per second. Texts stay
              pending until the bridge is running. Set it up in{' '}
              <button onClick={() => navigate('/settings')} className="font-medium text-gold-400 hover:text-gold-300">
                Settings
              </button>
              .
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
