import { useState, useCallback } from 'react'
import { Task, TaskStatus } from '@/types'
import { tasksApi } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'

export function useKanban(projectId: string) {
  const queryClient = useQueryClient()
  const [optimisticTasks, setOptimisticTasks] = useState<Record<string, Task>>({})

  const moveTask = useCallback(
    async (taskId: string, newStatus: TaskStatus, newPosition: number) => {
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', projectId])

      setOptimisticTasks((prev) => ({
        ...prev,
        [taskId]: { ...prev[taskId], status: newStatus, position: newPosition },
      }))

      queryClient.setQueryData<Task[]>(['tasks', projectId], (old) =>
        old?.map((task) =>
          task.id === taskId ? { ...task, status: newStatus, position: newPosition } : task
        )
      )

      try {
        await tasksApi.move(taskId, { status: newStatus, position: newPosition })
        delete optimisticTasks[taskId]
      } catch (error) {
        if (previousTasks) {
          queryClient.setQueryData(['tasks', projectId], previousTasks)
        }
        throw error
      }
    },
    [projectId, queryClient, optimisticTasks]
  )

  const updateTask = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', projectId])

      queryClient.setQueryData<Task[]>(['tasks', projectId], (old) =>
        old?.map((task) => (task.id === taskId ? { ...task, ...updates } : task))
      )

      try {
        await tasksApi.update(taskId, updates)
      } catch (error) {
        if (previousTasks) {
          queryClient.setQueryData(['tasks', projectId], previousTasks)
        }
        throw error
      }
    },
    [projectId, queryClient]
  )

  return {
    moveTask,
    updateTask,
    optimisticTasks,
  }
}