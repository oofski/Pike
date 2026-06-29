import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Download,
  Smartphone,
  Users,
  Archive,
  KeyRound,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Plus,
  Info
} from 'lucide-react'
import { api, serverInfo } from '@/lib/api'
import { qk } from '@/lib/queryKeys'
import { useAuth } from '@/stores/auth'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { UpdateButton } from '@/components/UpdateButton'
import type { ServerInfo, Role } from '@shared/types'

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  rush_chair: 'Rush Chair',
  brother: 'Brother'
}

function CopyButton({ value, label }: { value: string; label?: string }): JSX.Element {
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(value)
        toast.success(`${label || 'Copied'} to clipboard`)
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 px-2.5 py-1.5 text-xs font-medium text-ink-200 transition hover:bg-white/5"
    >
      <Copy size={13} /> Copy
    </button>
  )
}

export default function SettingsPage(): JSX.Element {
  const { user, can } = useAuth()
  const isAdmin = can('admin')
  const canManageBridge = can('admin', 'rush_chair')
  const [info, setInfo] = useState<ServerInfo | null>(null)

  useEffect(() => {
    void serverInfo().then(setInfo)
  }, [])

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-50">Settings</h1>
        <p className="text-sm text-ink-400">App configuration, the Mac bridge, and account management.</p>
      </div>

      <AppUpdatesCard version={info?.version} />
      {canManageBridge && <BridgeCard info={info} />}
      {isAdmin && <UserManagementCard currentUserId={user?.id || ''} />}
      <SeasonCard isAdmin={isAdmin} />
      <SeededAccountsCard />
    </div>
  )
}

// ------------------------------------------------------------------
function AppUpdatesCard({ version }: { version?: string }): JSX.Element {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Download size={18} className="text-gold-500" /> App &amp; Updates
          </span>
        }
        subtitle={version ? `PIKE Rush v${version}` : 'Loading version…'}
      />
      <div className="flex flex-wrap items-center gap-4">
        <UpdateButton compact={false} />
        <p className="max-w-md text-xs text-ink-400">
          Checks GitHub for a newer release. If one is found it downloads automatically and offers to restart and
          install — your data is never touched.
        </p>
      </div>
    </Card>
  )
}

// ------------------------------------------------------------------
function BridgeCard({ info }: { info: ServerInfo | null }): JSX.Element {
  const qc = useQueryClient()
  const [revealed, setRevealed] = useState(false)
  const bridgeKey = useQuery({ queryKey: qk.bridgeKey, queryFn: api.auth.bridgeKey })

  const rotate = useMutation({
    mutationFn: api.auth.rotateBridgeKey,
    onSuccess: () => {
      toast.success('Bridge key rotated — update the .env on the Mac')
      qc.invalidateQueries({ queryKey: qk.bridgeKey })
      setRevealed(true)
    },
    onError: (e: Error) => toast.error(e.message)
  })

  const key = bridgeKey.data?.key || ''
  const masked = key ? key.slice(0, 4) + '••••••••••••' + key.slice(-4) : ''
  const apiUrl = info?.lanUrl || ''

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Smartphone size={18} className="text-gold-500" /> Mac iMessage Bridge
          </span>
        }
        subtitle="Connect the bridge script to send queued texts via Messages.app"
      />

      <div className="space-y-4">
        <div>
          <label className="label">RUSHMANAGER_API_URL</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg border border-ink-700 bg-ink-950/60 px-3 py-2 text-sm text-gold-300">
              {apiUrl || '—'}
            </code>
            {apiUrl && <CopyButton value={apiUrl} label="URL copied" />}
          </div>
        </div>

        <div>
          <label className="label">RUSHMANAGER_API_KEY</label>
          {bridgeKey.isLoading ? (
            <Spinner />
          ) : (
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border border-ink-700 bg-ink-950/60 px-3 py-2 text-sm text-ink-100">
                {key ? (revealed ? key : masked) : 'No key generated yet'}
              </code>
              {key && (
                <>
                  <button
                    onClick={() => setRevealed((r) => !r)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 px-2.5 py-1.5 text-xs font-medium text-ink-200 transition hover:bg-white/5"
                  >
                    {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
                    {revealed ? 'Hide' : 'Reveal'}
                  </button>
                  <CopyButton value={key} label="Key copied" />
                </>
              )}
              <Button size="sm" variant="ghost" onClick={() => rotate.mutate()} disabled={rotate.isPending}>
                <RefreshCw size={13} className={rotate.isPending ? 'animate-spin' : ''} />
                Rotate Key
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/5 bg-ink-950/40 p-4 text-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink-100">
            <KeyRound size={15} className="text-gold-500" /> Setup steps
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed text-ink-400">
            <li>On a Mac signed in to iMessage, download the bridge folder and run <code className="text-gold-300">npm install</code>.</li>
            <li>
              Copy <code className="text-gold-300">.env.example</code> to <code className="text-gold-300">.env</code> and
              paste the URL and key above.
            </li>
            <li>Make sure Messages.app is open and signed in.</li>
            <li>Run <code className="text-gold-300">node bridge.js</code> and leave the Terminal open during a blast.</li>
          </ol>
        </div>
      </div>
    </Card>
  )
}

// ------------------------------------------------------------------
function UserManagementCard({ currentUserId }: { currentUserId: string }): JSX.Element {
  const qc = useQueryClient()
  const users = useQuery({ queryKey: qk.users, queryFn: api.auth.users })
  const [addOpen, setAddOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('brother')
  const [password, setPassword] = useState('')

  const create = useMutation({
    mutationFn: () =>
      api.auth.createUser({ email: email.trim(), name: name.trim(), role, password }),
    onSuccess: () => {
      toast.success('User added')
      qc.invalidateQueries({ queryKey: qk.users })
      setAddOpen(false)
      setEmail('')
      setName('')
      setRole('brother')
      setPassword('')
    },
    onError: (e: Error) => toast.error(e.message)
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.auth.deleteUser(id),
    onSuccess: () => {
      toast.success('User removed')
      qc.invalidateQueries({ queryKey: qk.users })
      setConfirmDelete(null)
    },
    onError: (e: Error) => toast.error(e.message)
  })

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Users size={18} className="text-gold-500" /> User Management
          </span>
        }
        subtitle="Brothers, rush chairs, and admins who can log in"
        action={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={15} /> Add User
          </Button>
        }
      />

      {users.isLoading ? (
        <Spinner />
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/5">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-950/40 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.data?.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2.5 font-medium text-ink-50">{u.name}</td>
                  <td className="px-4 py-2.5 text-ink-300">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-ink-200">
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {u.id !== currentUserId && (
                      <button
                        onClick={() => setConfirmDelete(u.id)}
                        className="text-ink-400 transition hover:text-garnet-300"
                        title="Remove user"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add User"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => create.mutate()}
              disabled={!email.trim() || !name.trim() || password.length < 6 || create.isPending}
            >
              {create.isPending ? 'Adding…' : 'Add User'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Smith" />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@vanderbilt.edu"
          />
          <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="brother">Brother</option>
            <option value="rush_chair">Rush Chair</option>
            <option value="admin">Admin</option>
          </Select>
          <Input
            label="Temporary Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Remove user?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => confirmDelete && remove.mutate(confirmDelete)} disabled={remove.isPending}>
              {remove.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-200">This user will no longer be able to log in. This cannot be undone.</p>
      </Modal>
    </Card>
  )
}

// ------------------------------------------------------------------
function SeasonCard({ isAdmin }: { isAdmin: boolean }): JSX.Element {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Archive size={18} className="text-gold-500" /> Season
          </span>
        }
        subtitle="Wipe PNMs and start a fresh rush season"
      />
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="danger" disabled>
          <Archive size={16} /> Archive Season
        </Button>
        <p className="max-w-md text-xs text-ink-400">
          {isAdmin
            ? 'Coming soon — this will archive the current PNMs, events, and votes so you can start next year clean.'
            : 'Only admins can archive a season.'}
        </p>
      </div>
    </Card>
  )
}

// ------------------------------------------------------------------
function SeededAccountsCard(): JSX.Element {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Info size={18} className="text-gold-500" /> Seeded Accounts
          </span>
        }
        subtitle="Default logins for first run"
      />
      <div className="space-y-1.5 text-sm text-ink-300">
        <p>This is a closed system — there&apos;s no public sign-up. New members are added above by an admin.</p>
        <p className="text-xs text-ink-400">
          The first-run seed creates one admin (rush chair) account. Change its password from the account that&apos;s
          logged in, and add the rest of the chapter under User Management.
        </p>
      </div>
    </Card>
  )
}
