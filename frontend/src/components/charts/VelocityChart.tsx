'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface VelocityChartProps {
  data: { sprint: string; completed: number; committed: number }[]
}

export function VelocityChart({ data }: VelocityChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Velocity Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-surface-500">
            No velocity data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Velocity</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-surface-200 dark:stroke-surface-700" />
            <XAxis dataKey="sprint" className="text-surface-600 dark:text-surface-400" />
            <YAxis className="text-surface-600 dark:text-surface-400" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="committed"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={{ fill: '#0ea5e9', strokeWidth: 2 }}
              name="Committed"
            />
            <Line
              type="monotone"
              dataKey="completed"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: '#22c55e', strokeWidth: 2 }}
              name="Completed"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}