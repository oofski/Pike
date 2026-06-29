import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import type { EventClickArg } from '@fullcalendar/core'
import { Plus, MapPin, Clock, Users, QrCode, CalendarDays } from 'lucide-react'
import { api } from '@/lib/api'
import { qk } from '@/lib/queryKeys'
import { useAuth } from '@/stores/auth'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { Avatar } from '@/components/ui/Avatar'
import { EventBadge } from '@/components/EventBadge'
import { EventModal } from '@/components/EventModal'
import { EVENT_TYPE_META } from '@shared/branding'
import { formatDateTime, formatTime, formatDate } from '@/lib/utils'
import type { RushEvent } from '@shared/types'

export default function CalendarPage(): JSX.Element {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { can } = useAuth()
  const canManage = can('rush_chair', 'admin')

  const [selected, setSelected] = useState<RushEvent | null>(null)
  const [showAttendees, setShowAttendees] = useState(false)
  const [eventModal, setEventModal] = useState(false)
  const [editEvent, setEditEvent] = useState<RushEvent | null>(null)
  const [presetStart, setPresetStart] = useState<string | undefined>(undefined)
  const [opening, setOpening] = useState(false)
  const calRef = useRef<FullCalendar | null>(null)

  const events = useQuery({ queryKey: qk.events, queryFn: api.events.list })

  const attendees = useQuery({
    queryKey: selected ? qk.eventAttendees(selected.id) : ['events', 'none', 'attendees'],
    queryFn: () => api.events.attendees(selected!.id),
    enabled: showAttendees && !!selected
  })

  const fcEvents =
    events.data?.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start_time,
      end: e.end_time || undefined,
      backgroundColor: EVENT_TYPE_META[e.type].calendar,
      borderColor: EVENT_TYPE_META[e.type].calendar,
      extendedProps: { event: e }
    })) || []

  const onEventClick = (arg: EventClickArg): void => {
    setSelected(arg.event.extendedProps.event as RushEvent)
  }

  const onDateClick = (arg: DateClickArg): void => {
    if (!canManage) return
    setEditEvent(null)
    setPresetStart(arg.date.toISOString())
    setEventModal(true)
  }

  const openSignIn = async (): Promise<void> => {
    if (!selected) return
    setOpening(true)
    try {
      const session = await api.signin.open(selected.id)
      toast.success('Sign-in opened')
      qc.invalidateQueries({ queryKey: qk.signinSessions })
      navigate('/signin-admin/' + session.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open sign-in')
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-50">Rush Calendar</h1>
          <p className="text-sm text-ink-400">Every rush event in one place. Click an event for details.</p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setEditEvent(null)
              setPresetStart(undefined)
              setEventModal(true)
            }}
          >
            <Plus size={16} /> Add Rush Event
          </Button>
        )}
      </div>

      <Card className="p-4">
        {events.isLoading ? (
          <div className="flex h-96 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <FullCalendar
            ref={calRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek'
            }}
            buttonText={{ today: 'Today', month: 'Month', week: 'Week' }}
            height="auto"
            events={fcEvents}
            eventClick={onEventClick}
            dateClick={onDateClick}
            dayMaxEvents={3}
            nowIndicator
            eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
          />
        )}
      </Card>

      {/* Color legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-400">
        {Object.entries(EVENT_TYPE_META).map(([key, m]) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.calendar }} />
            {m.label}
          </span>
        ))}
      </div>

      {/* Event detail modal */}
      <Modal
        open={!!selected && !showAttendees}
        onClose={() => setSelected(null)}
        title={selected?.title}
        footer={
          selected && (
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              {canManage ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditEvent(selected)
                    setSelected(null)
                    setEventModal(true)
                  }}
                >
                  Edit Event
                </Button>
              ) : (
                <span />
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => setShowAttendees(true)}>
                  <Users size={15} /> View Attendees
                </Button>
                {canManage && (
                  <Button onClick={openSignIn} disabled={opening}>
                    <QrCode size={15} /> {opening ? 'Opening…' : 'Open Sign-In'}
                  </Button>
                )}
              </div>
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <EventBadge type={selected.type} />
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-ink-200">
                <Clock size={15} className="text-gold-500" />
                {formatDateTime(selected.start_time)}
                {selected.end_time && ` – ${formatTime(selected.end_time)}`}
              </div>
              {selected.location && (
                <div className="flex items-center gap-2 text-ink-200">
                  <MapPin size={15} className="text-gold-500" />
                  {selected.location}
                </div>
              )}
              <div className="flex items-center gap-2 text-ink-200">
                <Users size={15} className="text-gold-500" />
                {selected.attendance_count ?? 0} PNM{selected.attendance_count === 1 ? '' : 's'} signed in
              </div>
            </div>
            {selected.description && (
              <p className="whitespace-pre-wrap rounded-xl border border-white/5 bg-ink-950/40 p-3 text-sm text-ink-200">
                {selected.description}
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Attendees modal */}
      <Modal
        open={showAttendees}
        onClose={() => setShowAttendees(false)}
        title={`Attendees — ${selected?.title ?? ''}`}
      >
        {attendees.isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Spinner />
          </div>
        ) : attendees.data && attendees.data.length > 0 ? (
          <div className="space-y-2">
            {attendees.data.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate('/pnms/' + p.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-ink-950/40 p-2.5 text-left transition hover:border-gold-500/30"
              >
                <Avatar photo={p.photo_url} first={p.first_name} last={p.last_name} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink-50">
                    {p.first_name} {p.last_name}
                  </div>
                  <div className="text-xs text-ink-400">Signed in {formatDate(p.signed_in_at)}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-ink-400">
            <CalendarDays size={28} className="text-gold-500" />
            <p className="text-sm">No PNMs have signed in to this event yet.</p>
          </div>
        )}
      </Modal>

      <EventModal
        open={eventModal}
        onClose={() => {
          setEventModal(false)
          setEditEvent(null)
          setPresetStart(undefined)
        }}
        event={editEvent || (presetStart ? ({ start_time: presetStart } as RushEvent) : null)}
      />
    </div>
  )
}
