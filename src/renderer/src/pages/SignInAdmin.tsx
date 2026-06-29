import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Wifi, Users, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import { api, serverInfo } from '@/lib/api'
import { qk } from '@/lib/queryKeys'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { QRCodeDisplay } from '@/components/QRCodeDisplay'
import type { ServerInfo } from '@shared/types'

export default function SignInAdminPage(): JSX.Element {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [info, setInfo] = useState<ServerInfo | null>(null)

  useEffect(() => {
    void serverInfo().then(setInfo)
  }, [])

  // Poll the session list every 3s for a live attendance count.
  const sessions = useQuery({
    queryKey: qk.signinSessions,
    queryFn: api.signin.list,
    refetchInterval: 3000
  })

  const session = sessions.data?.find((s) => s.id === sessionId)
  const url = info ? `${info.lanUrl}/signin/${sessionId}` : ''

  const close = useMutation({
    mutationFn: () => api.signin.close(sessionId),
    onSuccess: () => {
      toast.success('Sign-in closed')
      qc.invalidateQueries({ queryKey: qk.signinSessions })
    },
    onError: (e: Error) => toast.error(e.message)
  })

  const isOpen = session ? session.is_open === 1 : true

  return (
    <div className="animate-fade-in mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-ink-50">Event Sign-In</h1>
        <p className="text-sm text-ink-400">
          {session?.event_title ? session.event_title : 'PNMs scan the QR to sign in from their phones'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* QR */}
        <Card className="flex flex-col items-center justify-center gap-4">
          {!info ? (
            <div className="flex h-64 items-center justify-center">
              <Spinner />
            </div>
          ) : isOpen ? (
            <QRCodeDisplay url={url} caption="PNMs scan to sign in" size={220} />
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <CheckCircle2 size={40} className="text-emerald-400" />
              <p className="font-semibold text-ink-50">Sign-in closed</p>
              <p className="text-sm text-ink-400">No new PNMs can sign in to this event.</p>
            </div>
          )}
        </Card>

        {/* Status + controls */}
        <div className="space-y-6">
          <Card className="text-center">
            <CardHeader title="Live attendance" subtitle="Updates automatically" />
            <div className="flex flex-col items-center gap-1 py-2">
              <div className="flex items-center gap-2">
                {sessions.isFetching && <Loader2 size={14} className="animate-spin text-gold-500" />}
                <Users size={26} className="text-gold-500" />
              </div>
              <div className="font-display text-6xl font-bold tabular-nums text-ink-50">
                {session?.attendance_count ?? 0}
              </div>
              <div className="text-sm text-ink-400">PNMs signed in</div>
            </div>
          </Card>

          <Card className="space-y-3">
            {isOpen && (
              <Button
                variant="danger"
                className="w-full"
                onClick={() => close.mutate()}
                disabled={close.isPending}
              >
                {close.isPending ? 'Closing…' : 'Close Sign-In'}
              </Button>
            )}
            <Button variant="ghost" className="w-full" onClick={() => navigate('/calendar')}>
              Done <ArrowRight size={16} />
            </Button>
          </Card>
        </div>
      </div>

      <Card className="flex items-start gap-3 text-sm text-ink-300">
        <Wifi size={18} className="mt-0.5 shrink-0 text-gold-500" />
        <p className="text-xs leading-relaxed text-ink-400">
          Keep this screen up at the door. PNMs on the <strong className="text-ink-200">same Wi-Fi</strong> scan the QR
          code to open the sign-in form on their phones — no app or login needed. New phone numbers create a PNM record
          automatically; returning ones just get marked as attending this event.
        </p>
      </Card>
    </div>
  )
}
