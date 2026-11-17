'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Comment } from '@/types'
import { formatRelativeTime } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { commentsApi } from '@/lib/api'

interface CommentThreadProps {
  taskId: string
  comments: Comment[]
  newComment: string
  setNewComment: (value: string) => void
  onAddComment: () => void
  currentUserId?: string
}

export function CommentThread({
  taskId,
  comments,
  newComment,
  setNewComment,
  onAddComment,
  currentUserId,
}: CommentThreadProps) {
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const queryClient = useQueryClient()

  const handleEditComment = async (commentId: string) => {
    try {
      await commentsApi.update(taskId, commentId, { content: editContent })
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] })
      setEditingCommentId(null)
      setEditContent('')
    } catch (error) {
      console.error('Failed to edit comment:', error)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return
    try {
      await commentsApi.delete(taskId, commentId)
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] })
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
      <div className="space-y-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Write a comment..."
        />
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={onAddComment}>
            Comment
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar src={comment.user.avatar_url} name={comment.user.full_name} size="sm" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{comment.user.full_name}</p>
                <span className="text-xs text-surface-500">{formatRelativeTime(comment.created_at)}</span>
                {comment.id !== editingCommentId && comment.user_id === currentUserId && (
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
                    <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => handleEditComment(comment.id)}>
                      Save
                    </Button>
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
