import { useEffect, useState } from 'react'
import { RefreshCw, Download, CheckCircle2, AlertCircle, RotateCw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { UpdateStatus } from '@shared/types'

/**
 * "Check for Updates" control. Click the refresh button to check GitHub for a
 * newer release; if one exists it downloads automatically and offers a restart.
 */
export function UpdateButton({ compact = false }: { compact?: boolean }): JSX.Element {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.pike.getVersion().then(setVersion)
    window.pike.getUpdateStatus().then(setStatus)
    const off = window.pike.onUpdateStatus((s) => {
      setStatus(s)
      if (s.state === 'downloaded') toast.success(`Update ${s.version} ready — restart to install`)
      if (s.state === 'error') toast.error(`Update error: ${s.message}`)
    })
    return off
  }, [])

  const check = async (): Promise<void> => {
    setStatus({ state: 'checking' })
    const result = await window.pike.checkForUpdates()
    setStatus(result)
    if (result.state === 'not-available') toast.success("You're on the latest version")
  }

  const install = (): void => {
    void window.pike.installUpdate()
  }

  // Downloaded → primary restart action
  if (status.state === 'downloaded') {
    return (
      <button
        onClick={install}
        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-gold-500 to-gold-400 px-3 py-1.5 text-sm font-semibold text-ink-950 outline-none transition hover:from-gold-400 hover:to-gold-300 hover:shadow-glow focus-visible:ring-2 focus-visible:ring-gold-400/50 active:scale-[0.98]"
      >
        <RotateCw size={15} />
        Restart to update
      </button>
    )
  }

  const downloading = status.state === 'downloading'
  const checking = status.state === 'checking'
  const available = status.state === 'available'

  const Icon =
    status.state === 'error'
      ? AlertCircle
      : downloading || available
        ? Download
        : status.state === 'not-available'
          ? CheckCircle2
          : RefreshCw

  const labelFor = (): string => {
    switch (status.state) {
      case 'checking':
        return 'Checking…'
      case 'available':
        return `Found v${status.version}`
      case 'downloading':
        return `Downloading ${status.percent}%`
      case 'not-available':
        return 'Up to date'
      case 'error':
        return 'Check failed'
      default:
        return compact ? 'Updates' : 'Check for updates'
    }
  }

  return (
    <button
      onClick={check}
      disabled={checking || downloading}
      title={version ? `PIKE Rush v${version}` : 'Check for updates'}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border border-ink-700 px-3 py-1.5 text-sm font-medium text-ink-200 outline-none transition hover:bg-white/5 hover:text-ink-50 focus-visible:ring-1 focus-visible:ring-gold-500/40 disabled:cursor-not-allowed disabled:opacity-70',
        status.state === 'error' && 'border-garnet-500/40 text-garnet-200',
        status.state === 'not-available' && 'border-emerald-500/30 text-emerald-300'
      )}
    >
      <Icon size={15} className={cn((checking || downloading) && 'animate-spin')} />
      {!compact && <span>{labelFor()}</span>}
    </button>
  )
}
