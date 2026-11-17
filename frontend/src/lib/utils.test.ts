import { describe, it, expect } from 'vitest'
import { cn, formatRelativeTime, getStatusColor, getPriorityColor, getRoleColor } from './utils'

describe('cn utility', () => {
  it('should join class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar')
  })

  it('should handle empty inputs', () => {
    expect(cn()).toBe('')
  })
})

describe('formatRelativeTime', () => {
  it('should format recent times as "just now"', () => {
    const now = new Date().toISOString()
    expect(formatRelativeTime(now)).toBe('just now')
  })

  it('should format minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago')
  })

  it('should format hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago')
  })

  it('should format days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago')
  })

  it('should format dates for older times', () => {
    const oldDate = new Date('2024-01-15').toISOString()
    expect(formatRelativeTime(oldDate)).toBe('Jan 15, 2024')
  })
})

describe('getStatusColor', () => {
  it('should return correct colors for each status', () => {
    expect(getStatusColor('backlog')).toBe('bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-300')
    expect(getStatusColor('todo')).toBe('bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400')
    expect(getStatusColor('in_progress')).toBe('bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400')
    expect(getStatusColor('review')).toBe('bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400')
    expect(getStatusColor('done')).toBe('bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400')
  })
})

describe('getPriorityColor', () => {
  it('should return correct colors for each priority', () => {
    expect(getPriorityColor('low')).toBe('bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400')
    expect(getPriorityColor('medium')).toBe('bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400')
    expect(getPriorityColor('high')).toBe('bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400')
    expect(getPriorityColor('urgent')).toBe('bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400')
  })
})

describe('getRoleColor', () => {
  it('should return correct colors for each role', () => {
    expect(getRoleColor('owner')).toBe('bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400')
    expect(getRoleColor('admin')).toBe('bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400')
    expect(getRoleColor('member')).toBe('bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400')
    expect(getRoleColor('viewer')).toBe('bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-300')
  })
})