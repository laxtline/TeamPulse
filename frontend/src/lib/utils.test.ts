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
    expect(formatRelativeTime(oldDate)).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
  })
})

describe('getStatusColor', () => {
  it('should return correct colors for each status', () => {
    expect(getStatusColor('backlog')).toBe('bg-surface-100 text-surface-600 border-surface-200')
    expect(getStatusColor('todo')).toBe('bg-blue-50 text-blue-700 border-blue-100')
    expect(getStatusColor('in_progress')).toBe('bg-yellow-50 text-yellow-700 border-yellow-100')
    expect(getStatusColor('in_review')).toBe('bg-purple-50 text-purple-700 border-purple-100')
    expect(getStatusColor('done')).toBe('bg-green-50 text-green-700 border-green-100')
  })
})

describe('getPriorityColor', () => {
  it('should return correct colors for each priority', () => {
    expect(getPriorityColor('low')).toBe('bg-gray-50 text-gray-700 border-gray-100')
    expect(getPriorityColor('medium')).toBe('bg-blue-50 text-blue-700 border-blue-100')
    expect(getPriorityColor('high')).toBe('bg-orange-50 text-orange-700 border-orange-100')
    expect(getPriorityColor('urgent')).toBe('bg-red-50 text-red-700 border-red-100')
  })
})

describe('getRoleColor', () => {
  it('should return correct colors for each role', () => {
    expect(getRoleColor('owner')).toBe('bg-purple-50 text-purple-700 border-purple-100')
    expect(getRoleColor('admin')).toBe('bg-blue-50 text-blue-700 border-blue-100')
    expect(getRoleColor('member')).toBe('bg-green-50 text-green-700 border-green-100')
    expect(getRoleColor('viewer')).toBe('bg-gray-50 text-gray-700 border-gray-100')
  })
})