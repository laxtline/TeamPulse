'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Comment, User } from '@/types'
import { formatRelativeTime, getInitials } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { commentsApi } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(5000),
})

type CommentFormData = z.infer<typeof commentSchema>

interface CommentThreadProps {
  taskId: string
  initialComments: Comment[]
  currentUser: User
}

export function CommentThread({ taskId, initialComments, currentUser }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { errors } } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: '' },
  })

  const handleAddComment = async (data: CommentFormData) => {
    try {
      const comment = await commentsApi.create(taskId, data)
      setComments((prev) => [comment, ...prev])
      setNewComment('')
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }

  const handleEditComment = async (commentId: string) => {
    try {
      await commentsApi.update(commentId, { content: editContent })
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content: editContent, updated_at: new Date().toISOString() } : c))
      )
      setEditingCommentId(null)
      setEditContent('')
    } catch (error) {
      console.error('Failed to edit comment:', error)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return
    try {
      await commentsApi.delete(commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (error) {
      console.error('Failed to delete comment:', error)
    }
  }

  const handleStartEdit = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditContent(comment.content)
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditContent('')
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>

      <form onSubmit={handleSubmit(handleAddComment)} className="space-y-2">
        <div className="flex gap-2">
          <Avatar src={currentUser.avatar_url} name={currentUser.full_name} size="sm" />
          <div className="flex-1">
            <textarea
              {...register('content')}
              rows={3}
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Write a comment..."
            />
            {errors.content && <p className="text-sm text-red-600">{errors.content.message}</p>}
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm">Comment</Button>
        </div>
      </form>

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar src={comment.user.avatar_url} name={comment.user.full_name} size="sm" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{comment.user.full_name}</p>
                <span className="text-xs text-surface-500">{formatRelativeTime(comment.created_at)}</span>
                {comment.id !== editingCommentId && comment.user_id === currentUser.id && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleStartEdit(comment)}>
                      ✏️
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteComment(comment.id)}>
                      🗑️
                    </Button>
                  </>
                )}
              </div>
              {editingCommentId === comment.id ? (
                <div className="mt-1 space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Cancel</Button>
                    <Button size="sm" onClick={() => handleEditComment(comment.id)}>Save</Button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 whitespace-pre-wrap">{comment.content}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {comments.length === 0 && (
        <p className="text-center text-surface-500 py-8">No comments yet. Be the first to comment!</p>
      )}
    </div>
  )
}