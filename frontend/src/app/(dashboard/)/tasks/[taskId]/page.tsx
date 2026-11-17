'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi, commentsApi, aiApi } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'
import { CommentThread } from '@/components/tasks/CommentThread'
import { ActivityLog } from '@/components/tasks/ActivityLog'
import { PriorityBadge } from '@/components/tasks/PriorityBadge'
import { TaskHeader } from '@/components/tasks/TaskHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from '@/components/ui/Dropdown'
import { Avatar } from '@/components/ui/Avatar'
import { PriorityIndicator } from '@/components/ai/PriorityIndicator'
import { ArrowLeft, MoreHorizontal, Edit, Trash2, Flag, MessageSquare, Calendar, User, GitBranch, Zap, Loader2 } from 'lucide-react'
import { Task, Comment, TaskStatus, TaskPriority } from '@/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatRelativeTime, getStatusColor, getPriorityColor, cn } from '@/lib/utils'
import { useState } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useTeamStore } from '@/store/teamStore'
import Link from 'next/link'

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
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
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isCommentOpen, setIsCommentOpen] = useState(false)
  const [newComment, setNewComment] = useState('')

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
    mutationFn: (data: Partial<Task>) => tasksApi.update(task.project_id, taskId, data),
    onSuccess: (updatedTask) => {
      queryClient.setQueryData(['tasks', taskId], updatedTask)
      queryClient.invalidateQueries({ queryKey: ['projects', task.project_id] })
      setIsEditOpen(false)
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: () => tasksApi.delete(task.project_id, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', task.project_id] })
      router.push(`/teams/${task.team_id}/projects/${task.project_id}`)
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
    mutationFn: () => aiApi.predictPriority({
      title: task.title,
      description: task.description,
      project_key: task.project_key_prefix,
    }),
    onSuccess: (result) => {
      if (result.priority && result.priority !== task.priority) {
        updateTaskMutation.mutate({ priority: result.priority })
      }
    },
  })

  // WebSocket for real-time updates
  useWebSocket(task.project_id, {
    onCommentCreated: (comment) => {
      queryClient.setQueryData(['comments', taskId], (old: Comment[] = []) => [...old, comment])
    },
    onTaskUpdated: (updatedTask) => {
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
      <div className="p-6 text-center">
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
          <div>
            <Link href={`/teams/${task.team_id}/projects/${task.project_id}`} className="text-sm text-surface-500 hover:underline">
              {task.project_key_prefix} / {task.task_number}
            </Link>
            <h1 className="text-2xl font-bold mt-1">{task.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dropdown>
            <DropdownTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownTrigger>
            <DropdownContent align="end" className="w-48">
              <DropdownItem onClick={() => setIsEditOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Task
              </DropdownItem>
              <DropdownItem onClick={() => generateAIPriorityMutation.mutate()} disabled={generateAIPriorityMutation.isPending}>
                <Zap className="h-4 w-4 mr-2" />
                {generateAIPriorityMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'AI Suggest Priority'
                )}
              </DropdownItem>
              <DropdownItem onClick={() => { if (confirm('Delete this task?')) deleteTaskMutation.mutate() }} className="text-red-600" disabled={deleteTaskMutation.isPending}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Task
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        </div>
      </div>

      {/* Task Header with Status, Priority, Assignee */}
      <TaskHeader task={task} onStatusChange={(status) => updateTaskMutation.mutate({ status })} onPriorityChange={(priority) => updateTaskMutation.mutate({ priority })} onAssigneeChange={(assigneeId) => updateTaskMutation.mutate({ assignee_id: assigneeId })} />

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Description & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">{task.description}</div>
              ) : (
                <Button variant="link" onClick={() => setIsEditOpen(true)} className="text-surface-500 hover:text-primary-600">
                  Add a description...
                </Button>
              )}
            </CardContent>
          </Card>

          {/* AI Priority Indicator */}
          {task.ai_priority_score && (
            <PriorityIndicator
              score={task.ai_priority_score}
              reasoning={task.ai_priority_reasoning}
              suggestedPriority={task.ai_suggested_priority}
            />
          )}

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments ({comments?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CommentThread
                comments={comments || []}
                onAddComment={handleAddComment}
                newComment={newComment}
                setNewComment={setNewComment}
                taskId={taskId}
              />
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityLog taskId={taskId} />
            </CardContent          </Card>
        </div>

        {/* Right Column - Details Sidebar */}
        <div className="space-y-6">
          {/* Task Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-surface-500 uppercase tracking-wider">Status</label>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className={cn(getStatusColor(task.status), 'text-sm')}>
                    {task.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-surface-500 uppercase tracking-wider">Priority</label>
                <div className="mt-1">
                  <PriorityBadge priority={task.priority} />
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

              {task.story_points && (
                <div>
                  <label className="text-xs font-medium text-surface-500 uppercase tracking-wider">Story Points</label>
                  <div className="mt-1 font-medium">{task.story_points}</div>
                </div>
              )}

              {task.sprint_id && (
                <div>
                  <label className="text-xs font-medium text-surface-500 uppercase tracking-wider">Sprint</label>
                  <div className="mt-1 font-medium">Sprint #{task.sprint_id}</div>
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

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Task"
        description="Update task details"
      >
        <TaskEditForm task={task} onSubmit={updateTaskMutation.mutateAsync} onClose={() => setIsEditOpen(false)} isLoading={updateTaskMutation.isPending} />
      </Modal>
    </div>
  )
}

function TaskEditForm({ task, onSubmit, onClose, isLoading }: { task: Task; onSubmit: (data: Partial<Task>) => Promise<void>; onClose: () => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    assignee_id: task.assignee_id || '',
    due_date: task.due_date || '',
    story_points: task.story_points?.toString() || '',
    tags: task.tags?.join(', ') || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      title: formData.title,
      description: formData.description || undefined,
      status: formData.status as TaskStatus,
      priority: formData.priority as TaskPriority,
      assignee_id: formData.assignee_id || undefined,
      due_date: formData.due_date || undefined,
      story_points: formData.story_points ? parseInt(formData.story_points) : undefined,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />

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
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Assignee</label>
        <select
          value={formData.assignee_id}
          onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Unassigned</option>
          {task.project_members?.map((member: any) => (
            <option key={member.user_id} value={member.user_id}>{member.user_full_name}</option>
          ))}
        </select>
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

      <div>
        <label className="label">Tags (comma separated)</label>
        <input
          type="text"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="bug, frontend, urgent"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-border">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={isLoading}>Save Changes</Button>
      </div>
    </form>
  )
}