import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { ArrowLeft, Upload, FileSpreadsheet, Link2, Copy, FileText } from 'lucide-react'
import { api } from '@/lib/api'
import { qk } from '@/lib/queryKeys'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ImportPreview, type ImportRow } from '@/components/ImportPreview'
import { cn } from '@/lib/utils'

const TEMPLATE_HEADERS = 'First Name | Last Name | Phone Number'

function pick(row: Record<string, string>, keys: string[]): string {
  const lower: Record<string, string> = {}
  for (const k of Object.keys(row)) lower[k.trim().toLowerCase().replace(/[\s_]+/g, ' ')] = row[k]
  for (const key of keys) {
    const v = lower[key]
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function buildRows(parsed: Record<string, string>[], existingPhones: Set<string>): ImportRow[] {
  const seen = new Set<string>()
  return parsed
    .filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''))
    .map((r) => {
      const first = pick(r, ['first name', 'first', 'firstname'])
      const last = pick(r, ['last name', 'last', 'lastname'])
      const phoneRaw = pick(r, ['phone number', 'phone', 'phone #', 'mobile', 'cell'])
      const email = pick(r, ['email', 'email address', 'e mail'])
      const digits = phoneRaw.replace(/\D/g, '').slice(-10)

      let status: ImportRow['status'] = 'new'
      let reason: string | undefined

      if (!first || !last) {
        status = 'invalid'
        reason = 'Missing name'
      } else if (digits.length !== 10) {
        status = 'invalid'
        reason = 'Phone must be 10 digits'
      } else if (existingPhones.has(digits) || seen.has(digits)) {
        status = 'duplicate'
        reason = 'Phone already in system'
      }
      if (digits.length === 10) seen.add(digits)

      return {
        first_name: first,
        last_name: last,
        phone: phoneRaw || '—',
        email: email || undefined,
        status,
        reason
      }
    })
}

export default function ImportPnmsPage(): JSX.Element {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [mode, setMode] = useState<'csv' | 'sheets'>('csv')
  const [sheetUrl, setSheetUrl] = useState('')
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [eventId, setEventId] = useState('')
  const [parsing, setParsing] = useState(false)
  const [fileName, setFileName] = useState('')

  const events = useQuery({ queryKey: qk.events, queryFn: api.events.list })

  const getExistingPhones = async (): Promise<Set<string>> => {
    const all = await api.pnms.list()
    return new Set(all.map((p) => p.phone.replace(/\D/g, '').slice(-10)))
  }

  const parseCsvText = async (text: string): Promise<void> => {
    setParsing(true)
    try {
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true
      })
      const existing = await getExistingPhones()
      const built = buildRows(result.data, existing)
      if (!built.length) {
        toast.error('No rows found. Check your file has First Name, Last Name, Phone columns.')
        setRows([])
        return
      }
      setRows(built)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not parse file')
    } finally {
      setParsing(false)
    }
  }

  const onDrop = (files: File[]): void => {
    const file = files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => void parseCsvText(String(reader.result || ''))
    reader.readAsText(file)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'text/plain': ['.csv', '.tsv'] },
    maxFiles: 1
  })

  const fetchSheet = useMutation({
    mutationFn: () => api.pnms.importSheet(sheetUrl.trim()),
    onSuccess: (res) => void parseCsvText(res.csv),
    onError: (e: Error) => toast.error(e.message)
  })

  const validRows = rows?.filter((r) => r.status === 'new') ?? []
  const dupCount = rows?.filter((r) => r.status === 'duplicate').length ?? 0
  const invalidCount = rows?.filter((r) => r.status === 'invalid').length ?? 0

  const doImport = useMutation({
    mutationFn: () =>
      api.pnms.bulk({
        pnms: validRows.map((r) => ({
          first_name: r.first_name,
          last_name: r.last_name,
          phone: r.phone,
          email: r.email || null,
          source: 'google_sheets'
        })),
        event_id: eventId || null
      }),
    onSuccess: (res) => {
      toast.success(`Imported ${res.inserted} new PNM${res.inserted === 1 ? '' : 's'}`)
      qc.invalidateQueries({ queryKey: ['pnms'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      navigate('/pnms')
    },
    onError: (e: Error) => toast.error(e.message)
  })

  const copyTemplate = (): void => {
    void navigator.clipboard.writeText(TEMPLATE_HEADERS)
    toast.success('Template headers copied')
  }

  return (
    <div className="animate-fade-in space-y-6">
      <button
        onClick={() => navigate('/pnms')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-300 transition hover:text-gold-300"
      >
        <ArrowLeft size={16} /> Back to PNMs
      </button>

      <div>
        <h1 className="font-display text-3xl font-bold text-ink-50">Import PNMs</h1>
        <p className="text-sm text-ink-400">Upload a CSV or paste a public Google Sheets link.</p>
      </div>

      <Card className="space-y-4">
        <SegmentedControl
          options={[
            { value: 'csv', label: 'Upload CSV', icon: <Upload size={14} /> },
            { value: 'sheets', label: 'Google Sheets URL', icon: <Link2 size={14} /> }
          ]}
          value={mode}
          onChange={(v) => setMode(v as 'csv' | 'sheets')}
        />

        {mode === 'csv' ? (
          <div
            {...getRootProps()}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-700 px-6 py-12 text-center transition hover:border-gold-500/50',
              isDragActive && 'border-gold-500/70 bg-gold-500/5'
            )}
          >
            <input {...getInputProps()} />
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-800 text-gold-500">
              <FileSpreadsheet size={26} />
            </div>
            <p className="text-sm font-medium text-ink-100">
              {isDragActive ? 'Drop your CSV here' : 'Drag & drop a CSV, or click to browse'}
            </p>
            {fileName && <p className="text-xs text-gold-400">{fileName}</p>}
            <p className="text-xs text-ink-400">Exported from Google Sheets or any spreadsheet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Google Sheets share URL"
                placeholder="https://docs.google.com/spreadsheets/d/…"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
              />
            </div>
            <Button onClick={() => fetchSheet.mutate()} disabled={!sheetUrl.trim() || fetchSheet.isPending}>
              {fetchSheet.isPending ? 'Fetching…' : 'Fetch Sheet'}
            </Button>
          </div>
        )}

        {/* Template hint */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-ink-950/40 p-3 text-sm">
          <FileText size={16} className="shrink-0 text-gold-500" />
          <span className="text-ink-300">
            Your sheet should have these columns:{' '}
            <code className="rounded bg-ink-900 px-1.5 py-0.5 text-xs text-gold-300">{TEMPLATE_HEADERS}</code>
          </span>
          <button
            onClick={copyTemplate}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-gold-400 hover:text-gold-300"
          >
            <Copy size={13} /> Copy columns
          </button>
        </div>
      </Card>

      {(parsing || fetchSheet.isPending) && (
        <div className="flex h-32 items-center justify-center">
          <Spinner />
        </div>
      )}

      {rows && rows.length > 0 && !parsing && (
        <Card className="space-y-4">
          <CardHeader
            title="Preview"
            subtitle={`${validRows.length} new · ${dupCount} duplicate · ${invalidCount} invalid`}
          />

          <div className="max-w-xs">
            <Select label="Attach to event (optional)" value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">Don&apos;t attach to an event</option>
              {events.data?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </Select>
          </div>

          <ImportPreview rows={rows} />

          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setRows(null)
                setFileName('')
              }}
              className="text-xs font-medium text-ink-400 hover:text-ink-200"
            >
              Start over
            </button>
            <Button onClick={() => doImport.mutate()} disabled={!validRows.length || doImport.isPending}>
              <Upload size={16} />
              {doImport.isPending
                ? 'Importing…'
                : `Import ${validRows.length} new PNM${validRows.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
