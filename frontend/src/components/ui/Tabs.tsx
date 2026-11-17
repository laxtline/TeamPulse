'use client'

import { createContext, useContext, useState, ReactNode, Children, isValidElement, cloneElement } from 'react'
import { cn } from '@/lib/utils'

interface TabsContextType {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextType | null>(null)

function useTabsContext() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs components must be used within Tabs')
  }
  return context
}

interface TabsProps {
  children: ReactNode
  defaultValue: string
  onValueChange?: (value: string) => void
  className?: string
}

export function Tabs({ children, defaultValue, onValueChange, className }: TabsProps) {
  const [value, setValue] = useState(defaultValue)

  const handleValueChange = (newValue: string) => {
    setValue(newValue)
    onValueChange?.(newValue)
  }

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={cn('w-full', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: ReactNode
  className?: string
}

export function TabsList({ children, className }: TabsListProps) {
  const { value, onValueChange } = useTabsContext()

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-surface-100 dark:bg-surface-800 p-1 text-surface-500',
        className
      )}
    >
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child
        return cloneElement(child as any, {
          value: (child.props as any).value,
          isActive: (child.props as any).value === value,
          onValueChange,
        })
      })}
    </div>
  )
}

interface TabsTriggerProps {
  children: ReactNode
  value: string
  isActive?: boolean
  onValueChange?: (value: string) => void
  className?: string
  disabled?: boolean
}

export function TabsTrigger({ children, value, isActive, onValueChange, className, disabled }: TabsTriggerProps) {
  const handleClick = () => {
    if (!disabled) {
      onValueChange?.(value)
    }
  }

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      data-state={isActive ? 'active' : 'inactive'}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? 'bg-background text-surface-900 dark:text-surface-50 shadow-sm'
          : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300',
        className
      )}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  children: ReactNode
  value: string
  className?: string
}

export function TabsContent({ children, value, className }: TabsContentProps) {
  const { value: currentValue } = useTabsContext()

  if (currentValue !== value) return null

  return (
    <div
      role="tabpanel"
      className={cn('mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', className)}
    >
      {children}
    </div>
  )
}