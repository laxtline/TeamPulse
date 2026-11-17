'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi, commentsApi, aiApi } from '@/lib/api'
import { CommentThread } from '@/components/tasks/CommentThread'
import { ActivityLog } from '@/components/tasks/ActivityLog'
import { TaskHeader } from '@/components/tasks/TaskHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Dropdown } from '@/components/ui/Dropdown'
import { Avatar } from '@/components/ui/Avatar'
import { PriorityIndicator } from '@/components/ai/PriorityIndicator'
import { ArrowLeft, MoreHorizontal, Edit, Trash2, MessageSquare, Calendar, GitBranch, Zap, Loader2 } from 'lucide-react'
import { Task, Comment, TaskStatus, TaskPriority, AIPriority } from '@/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatRelativeTime, getStatusColor, getPriorityColor, cn } from '@/lib/utils'
import { useState } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useSession } from 'next-auth/react'

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'In Review' },
  { value: 'done', label: 'Done' },
]

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export default function TaskDetailPage() {
  const params = useParams()
  const taskId = params.taskId as string
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [aiPriority, setAiPriority] = useState<AIPriority | null>(null)

  const { data: task, isLoading } = useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => tasksApi.get(taskId),
    enabled: !!taskId,
  })

  const { data: comments } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => commentsApi.list(taskId),
    enabled: !!taskId,
  })

  const updateTaskMutation = useMutation({
    mutationFn: (data: Partial<Task>) => tasksApi.update(task?.project_id ?? '', taskId, data),
    onSuccess: (updatedTask) => {
      queryClient.setQueryData(['tasks', taskId], updatedTask)
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] })
      setIsEditOpen(false)
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: () => tasksApi.delete(task?.project_id ?? '', taskId),
    onSuccess: () => {
      router.back()
    },
  })

  const createCommentMutation = useMutation({
    mutationFn: (content: string) => commentsApi.create(taskId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] })
      setNewComment('')
    },
  })

  const generateAIPriorityMutation = useMutation({
    mutationFn: () =>
      aiApi.taskPriority({
        task_title: task?.title || '',
        task_description: task?.description || undefined,
        due_date: task?.due_date || undefined,
        assignee_workload: 0,
        project_velocity: 0,
      }),
    onSuccess: (result) => {
      setAiPriority(result)
    },
  })

  // Real-time updates for this task's project.
  useWebSocket({
    projectId: task?.project_id,
    onCommentCreated: (comment: Comment) => {
      queryClient.setQueryData(['comments', taskId], (old: Comment[] = []) => [...old, comment])
    },
    onTaskUpdated: (updatedTask: Task) => {
      if (updatedTask.id === taskId) {
        queryClient.setQueryData(['tasks', taskId], updatedTask)
      }
    },
  })

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold">Task not found</h1>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

  const handleAddComment = () => {
    if (newComment.trim()) {
      createCommentMutation.mutate(newComment)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{task.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Dropdown
            trigger={
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            }
            items={[
              {
                label: 'Edit Task',
                onClick: () => setIsEditOpen(true),
                icon: <Edit className="h-4 w-4" />,
              },
              {
                label: generateAIPriorityMutation.isPending ? 'Generating...' : 'AI Suggest Priority',
                onClick: () => generateAIPriorityMutation.mutate(),
                icon: generateAIPriorityMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                ),
                disabled: generateAIPriorityMutation.isPending,
              },
              {
                label: 'Delete Task',
                onClick: () => {
                  if (confirm('Delete this task?')) deleteTaskMutation.mutate()
                },
                icon: <Trash2 className="h-4 w-4" />,
                destructive: true,
                disabled: deleteTaskMutation.isPending,
              },
            ]}
          />
        </div>
      </div>

      <TaskHeader task={task} />

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Description & Discussion */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <p className="whitespace-pre-wrap text-surface-700 dark:text-surface-300">{task.description}</p>
              ) : (
                <Button variant="ghost" onClick={() => setIsEditOpen(true)} className="text-surface-500 hover:text-primary-600">
                  Add a description...
                </Button>
              )}
            </CardContent>
          </Card>

          {(aiPriority || task.ai_priority) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  AI Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PriorityIndicator priority={aiPriority || task.ai_priority || null} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments ({comments?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CommentThread
                taskId={taskId}
                comments={comments || []}
                newComment={newComment}
                setNewComment={setNewComment}
                onAddComment={handleAddComment}
                currentUserId={session?.user?.id}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityLog activities={task.activities || []} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-surface-500 uppercase tracking-wider">Status</label>
                <div className="mt-1">
                  <Badge variant="outline" className={cn(getStatusColor(task.status), 'text-sm')}>
                    {task.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-surface-500 uppercase tracking-wider">Priority</label>
                <div className="mt-1">
                  <Badge variant="outline" className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                </div>
              </div>

              {task.assignee && (
                <div>
                  <label className="text-xs font-medium text-surface-500 uppercase tracking-wider">Assignee</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Avatar src={task.assignee.avatar_url} name={task.assignee.full_name} size="sm" />
                    <span className="font-medium">{task.assignee.full_name}</span>
                  </div>
                </div>
              )}

              {task.reporter && (
                <div>
                  <label className="text-xs font-medium text-surface-500 uppercase tracking-wider">Reporter</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Avatar src={task.reporter.avatar_url} name={task.reporter.full_name} size="sm" />
                    <span className="font-medium">{task.reporter.full_name}</span>
                  </div>
                </div>
              )}

              {task.due_date && (
                <div>
                  <label className="text-xs font-medium text-surface-500 uppercase tracking-wider">Due Date</label>
                  <div className="mt-1 flex items-center gap-2 text-surface-700 dark:text-surface-300">
                    <Calendar className="h-4 w-4" />
                    <span>{formatRelativeTime(task.due_date)}</span>
                  </div>
                </div>
              )}

              {task.story_points !== null && (
                <div>
                  <label className="text-xs font-medium text-surface-500 uppercase tracking-wider">Story Points</label>
                  <div className="mt-1 font-medium">{task.story_points}</div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-surface-500 uppercase tracking-wider">Created</label>
                <div className="mt-1 text-surface-600 dark:text-surface-400">{formatRelativeTime(task.created_at)}</div>
              </div>

              <div>
                <label className="text-xs font-medium text-surface-500 uppercase tracking-wider">Updated</label>
                <div className="mt-1 text-surface-600 dark:text-surface-400">{formatRelativeTime(task.updated_at)}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Task"
        description="Update task details"
      >
        <TaskEditForm
          task={task}
          onSubmit={updateTaskMutation.mutateAsync}
          onClose={() => setIsEditOpen(false)}
          isLoading={updateTaskMutation.isPending}
        />
      </Modal>
    </div>
  )
}

function TaskEditForm({
  task,
  onSubmit,
  onClose,
  isLoading,
}: {
  task: Task
  onSubmit: (data: Partial<Task>) => Promise<unknown>
  onClose: () => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    due_date: task.due_date ? task.due_date.slice(0, 10) : '',
    story_points: task.story_points?.toString() || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      title: formData.title,
      description: formData.description || undefined,
      status: formData.status as TaskStatus,
      priority: formData.priority as TaskPriority,
      due_date: formData.due_date || undefined,
      story_points: formData.story_points ? parseInt(formData.story_points) : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />

      <div>
        <label className="label">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">Due Date</label>
          <input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label className="label">Story Points</label>
          <input
            type="number"
            value={formData.story_points}
            onChange={(e) => setFormData({ ...formData, story_points: e.target.value })}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            min="0"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-border">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading}>
          Save Changes
        </Button>
      </div>
    </form>
  )
}
