import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Camera,
  MessageSquareText,
  Trash2,
  CalendarCheck,
  Send,
  Loader2
} from 'lucide-react'
import { api, photoUrl } from '@/lib/api'
import { qk } from '@/lib/queryKeys'
import { useAuth } from '@/stores/auth'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/StatusBadge'
import { RatingPicker } from '@/components/RatingPicker'
import { EventBadge } from '@/components/EventBadge'
import { NotesList } from '@/components/NotesList'
import { VoteTally } from '@/components/VoteTally'
import { PNM_STATUSES, STATUS_META } from '@shared/branding'
import { cn, formatDate } from '@/lib/utils'
import type { Pnm, PnmStatus, Rating, VoteTally as VoteTallyType } from '@shared/types'

export default function PnmProfilePage(): JSX.Element {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user, can } = useAuth()
  const canManage = can('rush_chair', 'admin')
  const isAdmin = can('admin')

  const pnm = useQuery({ queryKey: qk.pnm(id), queryFn: () => api.pnms.get(id), enabled: !!id })
  const eventsQ = useQuery({ queryKey: qk.pnmEvents(id), queryFn: () => api.pnms.events(id), enabled: !!id })
  const notesQ = useQuery({ queryKey: qk.pnmNotes(id), queryFn: () => api.pnms.notes(id), enabled: !!id })
  const tallyQ = useQuery({
    queryKey: ['votes', id],
    queryFn: () => api.voting.tally(id) as Promise<VoteTallyType>,
    enabled: !!id
  })

  // Editable fields
  const [editing, setEditing] = useState(false)
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [noteText, setNoteText] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (pnm.data) {
      setFirst(pnm.data.first_name)
      setLast(pnm.data.last_name)
      setPhone(pnm.data.phone)
      setEmail(pnm.data.email || '')
    }
  }, [pnm.data])

  const invalidatePnm = (): void => {
    qc.invalidateQueries({ queryKey: qk.pnm(id) })
    qc.invalidateQueries({ queryKey: ['pnms'] })
  }

  const update = useMutation({
    mutationFn: (patch: Partial<Pnm>) => api.pnms.update(id, patch),
    onSuccess: () => {
      invalidatePnm()
    },
    onError: (e: Error) => toast.error(e.message)
  })

  const saveProfile = useMutation({
    mutationFn: () =>
      api.pnms.update(id, {
        first_name: first.trim(),
        last_name: last.trim(),
        phone: phone.trim(),
        email: email.trim() || null
      }),
    onSuccess: () => {
      invalidatePnm()
      toast.success('Profile saved')
      setEditing(false)
    },
    onError: (e: Error) => toast.error(e.message)
  })

  const addNote = useMutation({
    mutationFn: () => api.pnms.addNote(id, noteText.trim()),
    onSuccess: () => {
      setNoteText('')
      qc.invalidateQueries({ queryKey: qk.pnmNotes(id) })
      toast.success('Note added')
    },
    onError: (e: Error) => toast.error(e.message)
  })

  const deleteNote = useMutation({
    mutationFn: (noteId: string) => api.pnms.deleteNote(id, noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.pnmNotes(id) }),
    onError: (e: Error) => toast.error(e.message)
  })

  const removePnm = useMutation({
    mutationFn: () => api.pnms.remove(id),
    onSuccess: () => {
      toast.success('PNM deleted')
      qc.invalidateQueries({ queryKey: ['pnms'] })
      navigate('/pnms')
    },
    onError: (e: Error) => toast.error(e.message)
  })

  const onDrop = async (files: File[]): Promise<void> => {
    const file = files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Photo must be under 10MB')
      return
    }
    setUploading(true)
    try {
      await api.pnms.uploadPhoto(id, file)
      invalidatePnm()
      toast.success('Photo updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.heic', '.webp'] },
    maxFiles: 1,
    noClick: true,
    disabled: !canManage
  })

  if (pnm.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (pnm.isError || !pnm.data) {
    return (
      <div className="animate-fade-in space-y-4">
        <Button variant="ghost" onClick={() => navigate('/pnms')}>
          <ArrowLeft size={16} /> Back to PNMs
        </Button>
        <Card>
          <p className="text-sm text-ink-300">This PNM could not be found.</p>
        </Card>
      </div>
    )
  }

  const p = pnm.data
  const imgUrl = photoUrl(p.photo_url)

  return (
    <div className="animate-fade-in space-y-6">
      <button
        onClick={() => navigate('/pnms')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-300 transition hover:text-gold-300"
      >
        <ArrowLeft size={16} /> Back to PNMs
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6">
          <Card className="flex flex-col items-center gap-4 text-center">
            <div
              {...getRootProps()}
              className={cn(
                'group relative overflow-hidden rounded-full',
                canManage && 'cursor-pointer'
              )}
              onClick={() => canManage && open()}
            >
              <input {...getInputProps()} />
              <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-garnet-700 to-garnet-500 text-4xl font-bold text-gold-100 ring-4 ring-gold-500/20">
                {imgUrl ? (
                  <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>
                    {p.first_name.charAt(0)}
                    {p.last_name.charAt(0)}
                  </span>
                )}
              </div>
              {canManage && (
                <div
                  className={cn(
                    'absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-black/55 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100',
                    isDragActive && 'opacity-100'
                  )}
                >
                  {uploading ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
                  <span>{uploading ? 'Uploading…' : 'Change photo'}</span>
                </div>
              )}
            </div>

            {editing ? (
              <div className="w-full space-y-3 text-left">
                <div className="grid grid-cols-2 gap-2">
                  <Input label="First" value={first} onChange={(e) => setFirst(e.target.value)} />
                  <Input label="Last" value={last} onChange={(e) => setLast(e.target.value)} />
                </div>
                <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
                    {saveProfile.isPending ? 'Saving…' : 'Save'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="font-display text-2xl font-bold text-ink-50">
                  {p.first_name} {p.last_name}
                </h1>
                <p className="text-sm text-ink-300">{p.email || 'No email on file'}</p>
                <p className="mt-1 text-sm text-gold-400">{p.phone}</p>
                <div className="mt-3">
                  <StatusBadge status={p.status} />
                </div>
                {canManage && (
                  <button
                    onClick={() => setEditing(true)}
                    className="mt-3 text-xs font-medium text-gold-400 hover:text-gold-300"
                  >
                    Edit profile
                  </button>
                )}
              </div>
            )}
          </Card>

          {/* Status + rating */}
          <Card className="space-y-4">
            <div>
              <label className="label">Status</label>
              {canManage ? (
                <Select
                  value={p.status}
                  onChange={(e) => update.mutate({ status: e.target.value as PnmStatus })}
                >
                  {PNM_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s].label}
                    </option>
                  ))}
                </Select>
              ) : (
                <div>
                  <StatusBadge status={p.status} />
                </div>
              )}
            </div>
            <div>
              <label className="label">Internal Rating</label>
              <RatingPicker
                value={p.internal_rating}
                onChange={(r: Rating) => update.mutate({ internal_rating: r })}
              />
            </div>
          </Card>

          {/* Actions */}
          <Card className="space-y-2">
            <Button variant="ghost" className="w-full" onClick={() => navigate('/texting')}>
              <MessageSquareText size={16} /> Send Text
            </Button>
            {isAdmin && (
              <Button variant="danger" className="w-full" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={16} /> Delete PNM
              </Button>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Voting results */}
          <Card>
            <CardHeader title="Voting results" subtitle="Chapter vote tally" />
            {tallyQ.data ? (
              <VoteTally tally={tallyQ.data} revealed />
            ) : (
              <p className="text-sm text-ink-400">No votes recorded yet.</p>
            )}
          </Card>

          {/* Events attended */}
          <Card>
            <CardHeader
              title="Events attended"
              subtitle={`${eventsQ.data?.length ?? 0} total`}
            />
            {eventsQ.isLoading ? (
              <Spinner />
            ) : eventsQ.data && eventsQ.data.length > 0 ? (
              <div className="space-y-2">
                {eventsQ.data.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-ink-950/40 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <CalendarCheck size={16} className="text-gold-500" />
                      <div>
                        <div className="text-sm font-medium text-ink-50">{e.event_title || 'Event'}</div>
                        <div className="text-xs text-ink-400">{formatDate(e.signed_in_at)}</div>
                      </div>
                    </div>
                    {e.event_type && <EventBadge type={e.event_type} />}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-400">Hasn&apos;t signed in to any events yet.</p>
            )}
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader title="Notes" subtitle="Visible to all brothers" />
            <div className="mb-4 space-y-2">
              <Textarea
                placeholder="Add a note about this PNM…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => addNote.mutate()}
                  disabled={!noteText.trim() || addNote.isPending}
                >
                  <Send size={14} /> {addNote.isPending ? 'Posting…' : 'Add Note'}
                </Button>
              </div>
            </div>
            {notesQ.isLoading ? (
              <Spinner />
            ) : (
              <NotesList
                notes={notesQ.data || []}
                currentUserId={user?.id || ''}
                isAdmin={isAdmin}
                onDelete={(noteId) => deleteNote.mutate(noteId)}
              />
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete PNM?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => removePnm.mutate()} disabled={removePnm.isPending}>
              {removePnm.isPending ? 'Deleting…' : 'Delete PNM'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-200">
          This permanently deletes <strong className="text-ink-50">{p.first_name} {p.last_name}</strong>, along with
          their notes, attendance, and votes. This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
