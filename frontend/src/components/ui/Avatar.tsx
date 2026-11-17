'use client'

import { MouseEventHandler } from 'react'
import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  alt?: string
  name?: string
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

export function Avatar({ className, src, alt, name, size = 'md', shape = 'circle', onClick }: AvatarProps) {
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg'
  const sizeClass = sizeClasses[size]

  const fallback = name ? getInitials(name) : '?'

  if (src) {
    return (
      <img
        src={src}
        alt={alt || name || 'Avatar'}
        className={cn(sizeClass, shapeClass, 'object-cover', className)}
      />
    )
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        sizeClass,
        shapeClass,
        'flex items-center justify-center font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
        className
      )}
      aria-label={name || 'User avatar'}
    >
      {fallback}
    </div>
  )
}
