import { QRCodeSVG } from 'qrcode.react'

export function QRCodeDisplay({
  url,
  size = 220,
  caption
}: {
  url: string
  size?: number
  caption?: string
}): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-2xl bg-white p-4 shadow-glow">
        <QRCodeSVG value={url} size={size} level="M" fgColor="#7b1113" bgColor="#ffffff" />
      </div>
      {caption && <p className="text-sm text-ink-400">{caption}</p>}
      <code className="max-w-full break-all rounded-lg bg-ink-950/60 px-3 py-1.5 text-center text-xs text-gold-300">
        {url}
      </code>
    </div>
  )
}
