import { useState } from 'react'
import { cn } from '@/lib/utils'
import { initials } from '@/lib/utils'
import { photoUrl } from '@/lib/api'

export function Avatar({
  photo,
  first,
  last,
  size = 48,
  className
}: {
  photo?: string | null
  first?: string
  last?: string
  size?: number
  className?: string
}): JSX.Element {
  const [error, setError] = useState(false)
  const url = photoUrl(photo)
  const showImage = url && !error
  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-garnet-700 to-garnet-500 font-bold text-gold-100',
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {showImage ? (
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <span>{initials(first, last)}</span>
      )}
    </div>
  )
}
