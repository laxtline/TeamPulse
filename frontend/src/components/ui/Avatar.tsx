'use client'

import { MouseEventHandler, useMemo, useState } from 'react'
import { cn, getInitials, md5 } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  alt?: string
  name?: string | null
  email?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  shape?: 'circle' | 'square'
  className?: string
  onClick?: MouseEventHandler<HTMLDivElement>
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

const pixelSizes = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
}

// Same person always gets the same colour, which makes member lists easier to
// scan than every avatar being the same blue.
const initialColors = [
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
]

function getGravatarUrl(email: string, size: number): string {
  const hash = md5(email.trim().toLowerCase())
  // d=404 means "return 404 instead of the default icon", so we can fall back
  // to initials when the address has no Gravatar.
  return `https://www.gravatar.com/avatar/${hash}?d=404&s=${size}`
}

function colorFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return initialColors[Math.abs(hash) % initialColors.length]
}

export function Avatar({
  className,
  src,
  alt,
  name,
  email,
  size = 'md',
  shape = 'circle',
  onClick,
}: AvatarProps) {
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg'
  const sizeClass = sizeClasses[size]
  const fallback = name ? getInitials(name) : '?'
  const [failedSources, setFailedSources] = useState<string[]>([])

  // Priority: explicit URL → Gravatar → initials. If the URL 404s we move on
  // to the next candidate instead of showing a broken image.
  const sources = useMemo(() => {
    const candidates: string[] = []
    if (src && src.trim()) candidates.push(src.trim())
    if (email) candidates.push(getGravatarUrl(email, pixelSizes[size]))
    return candidates
  }, [src, email, size])

  const activeSrc = sources.find((candidate) => !failedSources.includes(candidate))

  return (
    <div
      onClick={onClick}
      className={cn(
        sizeClass,
        shapeClass,
        'relative flex shrink-0 items-center justify-center overflow-hidden font-medium',
        colorFor(name || email || 'user'),
        className
      )}
      aria-label={name || alt || 'User avatar'}
    >
      <span aria-hidden="true">{fallback}</span>
      {activeSrc && (
        <img
          src={activeSrc}
          alt={alt || name || 'Avatar'}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => {
            setFailedSources((current) =>
              current.includes(activeSrc) ? current : [...current, activeSrc]
            )
          }}
        />
      )}
    </div>
  )
}
