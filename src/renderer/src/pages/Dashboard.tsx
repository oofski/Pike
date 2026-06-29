import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  CalendarDays,
  TrendingUp,
  Star,
  Plus,
  Upload,
  QrCode
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'
import { api } from '@/lib/api'
import { qk } from '@/lib/queryKeys'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/StatCard'
import { EventModal } from '@/components/EventModal'
import { EVENT_TYPE_META } from '@shared/branding'
import { BRAND } from '@shared/branding'
import { useAuth } from '@/stores/auth'

const STATUS_COLORS: Record<string, string> = {
  pending: '#94a3b8',
  invited: '#c9a227',
  accepted: '#22c55e',
  rejected: '#a51c2c'
}

export default function Dashboard(): JSX.Element {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [eventModal, setEventModal] = useState(false)

  const overview = useQuery({ queryKey: qk.statsOverview, queryFn: api.stats.overview })
  const attendance = useQuery({ queryKey: qk.statsAttendance, queryFn: api.stats.attendance })
  const growth = useQuery({ queryKey: qk.statsGrowth, queryFn: api.stats.growth })

  const o = overview.data
  const statusData = o
    ? [
        { name: 'Pending', value: o.pending, key: 'pending' },
        { name: 'Invited', value: o.invited, key: 'invited' },
        { name: 'Accepted', value: o.accepted, key: 'accepted' },
        { name: 'Rejected', value: o.rejected, key: 'rejected' }
      ].filter((s) => s.value > 0)
    : []

  const attendanceData =
    attendance.data?.map((a) => ({
      name: EVENT_TYPE_META[a.type].label,
      attendance: a.attendance,
      fill: EVENT_TYPE_META[a.type].calendar
    })) || []

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-50">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-ink-400">
            {BRAND.org} · {BRAND.chapter} · {BRAND.school} — Rush 2026 at a glance
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setEventModal(true)}>
            <Plus size={16} /> Add Rush Event
          </Button>
          <Button variant="ghost" onClick={() => navigate('/pnms/import')}>
            <Upload size={16} /> Import Sign-In Sheet
          </Button>
          <Button variant="ghost" onClick={() => navigate('/calendar')}>
            <QrCode size={16} /> Open Sign-In
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total PNMs" value={o?.total_pnms ?? '—'} icon={Users} accent="gold" />
        <StatCard label="Events this week" value={o?.events_this_week ?? '—'} icon={CalendarDays} accent="blue" />
        <StatCard label="Avg. attendance" value={o?.avg_attendance ?? '—'} icon={TrendingUp} accent="emerald" />
        <StatCard label='PNMs rated "Yes"' value={o?.yes_rated ?? '—'} icon={Star} accent="garnet" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Growth line */}
        <Card className="lg:col-span-2">
          <CardHeader title="PNMs added over time" subtitle="Last 30 days" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growth.data || []} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#8b90a0', fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fill: '#8b90a0', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#15171f', border: '1px solid rgba(201,162,39,0.25)', borderRadius: 10 }}
                  labelStyle={{ color: '#c9a227' }}
                />
                <Line type="monotone" dataKey="cumulative" name="Total PNMs" stroke="#c9a227" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="count" name="Added" stroke="#7b1113" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Status pie */}
        <Card>
          <CardHeader title="PNM status" subtitle="Current breakdown" />
          <div className="h-64">
            {statusData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {statusData.map((s) => (
                      <Cell key={s.key} fill={STATUS_COLORS[s.key]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#15171f', border: '1px solid rgba(201,162,39,0.25)', borderRadius: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-ink-400">No PNMs yet</div>
            )}
          </div>
        </Card>
      </div>

      {/* Attendance bar */}
      <Card>
        <CardHeader title="Attendance by event type" subtitle="Total sign-ins per category" />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendanceData} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#8b90a0', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8b90a0', fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{ background: '#15171f', border: '1px solid rgba(201,162,39,0.25)', borderRadius: 10 }}
              />
              <Bar dataKey="attendance" radius={[6, 6, 0, 0]}>
                {attendanceData.map((a, i) => (
                  <Cell key={i} fill={a.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <EventModal open={eventModal} onClose={() => setEventModal(false)} />
    </div>
  )
}
