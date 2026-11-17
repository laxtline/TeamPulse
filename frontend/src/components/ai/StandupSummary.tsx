'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/utils'
import { aiApi } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface StandupSummaryProps {
  userName: string
  date?: string
}

export function StandupSummary({ userName, date }: StandupSummaryProps) {
  const [summary, setSummary] = useState<string>('')
  const [priorities, setPriorities] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  const targetDate = date || new Date().toISOString().split('T')[0]

  const generateSummary = async () => {
    setIsLoading(true)
    try {
      const response = await aiApi.myStandup(targetDate)
      setSummary(response.summary)
      setPriorities(response.priorities)
    } catch (error) {
      console.error('Failed to generate standup summary:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Today's Standup</CardTitle>
        <Button variant="ghost" size="sm" onClick={generateSummary} loading={isLoading}>
          🔄 Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {summary ? (
          <p className="text-surface-700 dark:text-surface-300">{summary}</p>
        ) : (
          <Button variant="outline" onClick={generateSummary} className="w-full">
            Generate Standup Summary
          </Button>
        )}

        {priorities.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-surface-900 dark:text-surface-100">Priorities for Today</h4>
            <ol className="space-y-1 pl-4 list-decimal">
              {priorities.map((priority, index) => (
                <li key={index} className="text-sm text-surface-600 dark:text-surface-400">
                  {priority}
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  )
}