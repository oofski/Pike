import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Upload, Search, LayoutGrid, Rows3, Users } from 'lucide-react'
import { api } from '@/lib/api'
import { qk } from '@/lib/queryKeys'
import { useAuth } from '@/stores/auth'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { PNMCard } from '@/components/PNMCard'
import { StatusBadge } from '@/components/StatusBadge'
import { RATING_META, PNM_STATUSES, RATINGS, STATUS_META } from '@shared/branding'
import { formatPhone } from '@/lib/utils'
import type { CreatePnmInput, PnmSource } from '@shared/types'

const SOURCE_LABELS: Record<PnmSource, string> = {
  manual: 'Manual',
  google_sheets: 'Google Sheets',
  sign_in_form: 'Sign-In Form'
}

export default function PnmsPage(): JSX.Element {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { can } = useAuth()
  const canManage = can('rush_chair', 'admin')

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [rating, setRating] = useState('')
  const [source, setSource] = useState('')
  const [eventId, setEventId] = useState('')
  const [sort, setSort] = useState('name')
  const [view, setView] = useState<'grid' | 'table'>('grid')
  const [addOpen, setAddOpen] = useState(false)

  const params = useMemo(() => {
    const p: Record<string, string> = {}
    if (search.trim()) p.q = search.trim()
    if (status) p.status = status
    if (rating) p.rating = rating
    if (source) p.source = source
    if (eventId) p.event_id = eventId
    if (sort) p.sort = sort
    return p
  }, [search, status, rating, source, eventId, sort])

  const pnms = useQuery({ queryKey: qk.pnms(params), queryFn: () => api.pnms.list(params) })
  const events = useQuery({ queryKey: qk.events, queryFn: api.events.list })

  const hasFilters = !!(search || status || rating || source || eventId)
  const clearFilters = (): void => {
    setSearch('')
    setStatus('')
    setRating('')
    setSource('')
    setEventId('')
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-50">PNMs</h1>
          <p className="text-sm text-ink-400">
            {pnms.data ? `${pnms.data.length} potential new member${pnms.data.length === 1 ? '' : 's'}` : 'Loading…'}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => navigate('/pnms/import')}>
              <Upload size={16} /> Import
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus size={16} /> Add PNM
            </Button>
          </div>
        )}
      </div>

      {/* Controls */}
      <Card className="space-y-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              className="input pl-9"
              placeholder="Search name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <SegmentedControl
            options={[
              { value: 'grid', label: 'Grid', icon: <LayoutGrid size={14} /> },
              { value: 'table', label: 'Table', icon: <Rows3 size={14} /> }
            ]}
            value={view}
            onChange={(v) => setView(v as 'grid' | 'table')}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {PNM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </Select>
          <Select label="Rating" value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="">All ratings</option>
            {RATINGS.map((r) => (
              <option key={r} value={r}>
                {RATING_META[r].label}
              </option>
            ))}
          </Select>
          <Select label="Source" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">All sources</option>
            {(Object.keys(SOURCE_LABELS) as PnmSource[]).map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select label="Event" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">All events</option>
            {events.data?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </Select>
          <Select label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name">Name</option>
            <option value="created">Date added</option>
            <option value="events">Event count</option>
            <option value="rating">Rating</option>
          </Select>
        </div>
        {hasFilters && (
          <div className="flex justify-end">
            <button onClick={clearFilters} className="text-xs font-medium text-gold-400 hover:text-gold-300">
              Clear filters
            </button>
          </div>
        )}
      </Card>

      {/* Results */}
      {pnms.isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : !pnms.data || pnms.data.length === 0 ? (
        <EmptyState
          icon={Users}
          title={hasFilters ? 'No PNMs match your filters' : 'No PNMs yet'}
          description={
            hasFilters
              ? 'Try adjusting or clearing your filters.'
              : 'Import a sign-in sheet or add PNMs manually to get started.'
          }
          action={
            canManage &&
            !hasFilters && (
              <Button onClick={() => navigate('/pnms/import')}>
                <Upload size={16} /> Import PNMs
              </Button>
            )
          }
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {pnms.data.map((p) => (
            <PNMCard key={p.id} pnm={p} onClick={() => navigate('/pnms/' + p.id)} />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/5 bg-ink-950/40 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3 text-right">Events</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pnms.data.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate('/pnms/' + p.id)}
                  className="cursor-pointer transition hover:bg-white/5"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar photo={p.photo_url} first={p.first_name} last={p.last_name} size={32} />
                      <span className="font-medium text-ink-50">
                        {p.first_name} {p.last_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-ink-300">{formatPhone(p.phone)}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className={`px-4 py-2.5 font-medium ${RATING_META[p.internal_rating].text}`}>
                    {RATING_META[p.internal_rating].label}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink-300">{p.event_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <AddPnmModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={() => qc.invalidateQueries({ queryKey: ['pnms'] })} />
    </div>
  )
}

function AddPnmModal({
  open,
  onClose,
  onAdded
}: {
  open: boolean
  onClose: () => void
  onAdded: () => void
}): JSX.Element {
  const navigate = useNavigate()
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const reset = (): void => {
    setFirst('')
    setLast('')
    setPhone('')
    setEmail('')
  }

  const create = useMutation({
    mutationFn: () => {
      const input: CreatePnmInput = {
        first_name: first.trim(),
        last_name: last.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        source: 'manual'
      }
      return api.pnms.create(input)
    },
    onSuccess: (p) => {
      toast.success('PNM added')
      onAdded()
      reset()
      onClose()
      navigate('/pnms/' + p.id)
    },
    onError: (e: Error) => toast.error(e.message)
  })

  const digits = phone.replace(/\D/g, '')
  const valid = first.trim() && last.trim() && digits.length === 10

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add PNM"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} disabled={!valid || create.isPending}>
            {create.isPending ? 'Adding…' : 'Add PNM'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First Name" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="John" />
          <Input label="Last Name" value={last} onChange={(e) => setLast(e.target.value)} placeholder="Smith" />
        </div>
        <Input
          label="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(704) 555-1234"
        />
        {phone && digits.length !== 10 && (
          <p className="-mt-2 text-xs text-garnet-300">Phone must be 10 digits.</p>
        )}
        <Input
          label="Email (optional)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="john@vanderbilt.edu"
        />
      </div>
    </Modal>
  )
}
