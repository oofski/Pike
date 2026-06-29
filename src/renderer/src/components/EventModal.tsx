import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { EVENT_TYPES, EVENT_TYPE_META } from '@shared/branding'
import { toLocalInput, fromLocalInput } from '@/lib/utils'
import type { EventType, RushEvent } from '@shared/types'

export function EventModal({
  open,
  onClose,
  event
}: {
  open: boolean
  onClose: () => void
  event?: RushEvent | null
}): JSX.Element {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<EventType>('social')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  useEffect(() => {
    if (open) {
      setTitle(event?.title || '')
      setType(event?.type || 'social')
      setLocation(event?.location || '')
      setDescription(event?.description || '')
      setStart(toLocalInput(event?.start_time) || toLocalInput(new Date().toISOString()))
      setEnd(toLocalInput(event?.end_time))
    }
  }, [open, event])

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        type,
        location: location || null,
        description: description || null,
        start_time: fromLocalInput(start),
        end_time: end ? fromLocalInput(end) : null
      }
      return event ? api.events.update(event.id, payload) : api.events.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success(event ? 'Event updated' : 'Event created')
      onClose()
    },
    onError: (e: Error) => toast.error(e.message)
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? 'Edit Event' : 'Add Rush Event'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={!title || !start || save.isPending}>
            {save.isPending ? 'Saving…' : event ? 'Save Changes' : 'Create Event'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Broadway Bar Tab" />
        <Select label="Type" value={type} onChange={(e) => setType(e.target.value as EventType)}>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {EVENT_TYPE_META[t].label}
            </option>
          ))}
        </Select>
        <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="PIKE House" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          <Input label="End" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Open to all PNMs…"
        />
      </div>
    </Modal>
  )
}
