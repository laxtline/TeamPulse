'use client'

import { Activity } from '@/types'
import { formatRelativeTime, getInitials } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface ActivityLogProps {
  activities: Activity[]
}

const actionLabels: Record<string, string> = {
  created: 'Created task',
  moved: 'Moved task',
  updated: 'Updated task',
  assigned: 'Assigned task',
  commented: 'Added comment',
  completed: 'Completed task',
  deleted: 'Deleted task',
}

const actionIcons: Record<string, string> = {
  created: '➕',
  moved: '➡️',
  updated: '✏️',
  assigned: '👤',
  commented: '💬',
  completed: '✅',
  deleted: '🗑️',
}

export function ActivityLog({ activities }: ActivityLogProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Activity Log</h3>
      {activities.length === 0 ? (
        <p className="text-center text-surface-500 py-8">No activity yet</p>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <div key={activity.id} className="flex gap-3">
              <Avatar
                src={activity.user?.avatar_url}
                name={activity.user?.full_name}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{actionIcons[activity.action] || '📝'}</span>
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {activity.user?.full_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-surface-600 dark:text-surface-400">
                    {actionLabels[activity.action] || activity.action}
                  </p>
                  <span className="text-xs text-surface-500 ml-auto">
                    {formatRelativeTime(activity.created_at)}
                  </span>
                </div>
                {(activity.old_value || activity.new_value) && (
                  <div className="mt-1 ml-7 space-y-1 text-xs">
                    {activity.old_value && (
                      <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <span>−</span>
                        <code className="bg-surface-100 dark:bg-surface-800 px-1 rounded">
                          {JSON.stringify(activity.old_value).slice(0, 100)}
                        </code>
                      </div>
                    )}
                    {activity.new_value && (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <span>+</span>
                        <code className="bg-surface-100 dark:bg-surface-800 px-1 rounded">
                          {JSON.stringify(activity.new_value).slice(0, 100)}
                        </code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}