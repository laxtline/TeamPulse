'use client'

import { ImageHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/utils'

interface AvatarProps extends ImageHTMLAttributes<HTMLImageElement> {
  src?: string | null
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  shape?: 'circle' | 'square'
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

export const Avatar = forwardRef<HTMLImageElement, AvatarProps>(
  ({ className, src, alt, name, size = 'md', shape = 'circle', ...props }, ref) => {
    const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg'
    const sizeClass = sizeClasses[size]

    const fallback = name ? getInitials(name) : '?'

    if (src) {
      return (
        <img
          ref={ref}
          src={src}
          alt={alt || name || 'Avatar'}
          className={cn(sizeClass, shapeClass, 'object-cover', className)}
          {...props}
        />
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          sizeClass,
          shapeClass,
          'flex items-center justify-center font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
          className
        )}
        aria-label={name || 'User avatar'}
        {...props}
      >
        {fallback}
      </div>
    )
  }
)

Avatar.displayName = 'Avatar'