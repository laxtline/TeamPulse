'use client'

import { Fragment, ReactNode, useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export interface DropdownItem {
  label: string
  onClick: () => void
  icon?: ReactNode
  disabled?: boolean
  destructive?: boolean
}

interface DropdownProps {
  trigger: ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
}

export function Dropdown({ trigger, items, align = 'right' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <Fragment>
      <div ref={dropdownRef} className="relative inline-block">
        <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
          {trigger}
        </div>

        {isOpen && (
          <div
            className={cn(
              'fixed z-50 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-surface-900 border border-border shadow-lg animate-slide-down',
              align === 'right' ? 'right-0' : 'left-0'
            )}
            role="menu"
          >
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick()
                  setIsOpen(false)
                }}
                disabled={item.disabled}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                  item.destructive
                    ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800',
                  item.disabled && 'opacity-50 cursor-not-allowed'
                )}
                role="menuitem"
              >
                {item.icon && <span className="h-4 w-4">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </Fragment>
  )
}