'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface WorkloadChartProps {
  data: { user: string; tasks: number; points: number }[]
}

export function WorkloadChart({ data }: WorkloadChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workload Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-surface-500">
            No workload data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workload Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-surface-200 dark:stroke-surface-700" />
            <XAxis type="number" className="text-surface-600 dark:text-surface-400" />
            <YAxis dataKey="user" type="category" width={100} className="text-surface-600 dark:text-surface-400" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend />
            <Bar dataKey="tasks" name="Tasks" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell key={`tasks-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
            <Bar dataKey="points" name="Story Points" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell key={`points-${index}`} fill={COLORS[(index + 4) % COLORS.length]} opacity={0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}