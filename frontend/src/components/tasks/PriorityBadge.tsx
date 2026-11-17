'use client'

import { AIPriority } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface PriorityBadgeProps {
  priority: AIPriority | null
  compact?: boolean
}

export function PriorityBadge({ priority, compact = false }: PriorityBadgeProps) {
  if (!priority) return null

  const getActionColor = (action: string) => {
    switch (action) {
      case 'Do now':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'Schedule this week':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      case 'Delegate':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'Defer':
        return 'bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-300'
      default:
        return 'bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-300'
    }
  }

  return (
    <div className={cn('space-y-1', compact && 'flex items-center gap-2')}>
      <div className={cn('flex items-center gap-2', compact && 'flex-row')}>
        <Badge variant="outline" className={cn('text-lg font-mono', getPriorityColor(priority.score))}>
          {priority.score}/10
        </Badge>
        <Badge variant="outline" className={getActionColor(priority.suggested_action)}>
          {priority.suggested_action}
        </Badge>
      </div>
      {!compact && (
        <p className="text-sm text-surface-600 dark:text-surface-400">{priority.reasoning}</p>
      )}
    </div>
  )
}

function getPriorityColor(score: number): string {
  if (score >= 8) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  if (score >= 6) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
  if (score >= 4) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
  return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
}