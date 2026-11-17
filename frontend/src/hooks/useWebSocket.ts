import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuth } from './useAuth'
import { WebSocketEvent } from '@/types'

interface UseWebSocketOptions {
  teamId?: string
  projectId?: string
  onTaskCreated?: (data: any) => void
  onTaskMoved?: (data: any) => void
  onTaskUpdated?: (data: any) => void
  onTaskDeleted?: (data: any) => void
  onCommentCreated?: (data: any) => void
  onCommentUpdated?: (data: any) => void
  onCommentDeleted?: (data: any) => void
  onUserJoined?: (data: any) => void
  onUserLeft?: (data: any) => void
  onPresenceUpdate?: (data: any) => void
}

export function useWebSocket({
  teamId,
  projectId,
  onTaskCreated,
  onTaskMoved,
  onTaskUpdated,
  onTaskDeleted,
  onCommentCreated,
  onCommentUpdated,
  onCommentDeleted,
  onUserJoined,
  onUserLeft,
  onPresenceUpdate,
}: UseWebSocketOptions) {
  const { accessToken, isAuthenticated } = useAuth()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const [isConnected, setIsConnected] = useState(false)
  const maxReconnectAttempts = 5
  const baseReconnectDelay = 1000

  const getWsUrl = useCallback(() => {
    if (projectId) {
      return `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/api/v1/ws/projects/${projectId}?token=${accessToken}`
    }
    if (teamId) {
      return `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/api/v1/ws/${teamId}?token=${accessToken}`
    }
    return null
  }, [projectId, teamId, accessToken])

  const connect = useCallback(() => {
    if (!isAuthenticated || !accessToken) return

    const wsUrl = getWsUrl()
    if (!wsUrl) return

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      reconnectAttempts.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const message: WebSocketEvent = JSON.parse(event.data)
        handleMessage(message)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      attemptReconnect()
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }, [isAuthenticated, accessToken, getWsUrl])

  const handleMessage = (message: WebSocketEvent) => {
    switch (message.event) {
      case 'task:created':
        onTaskCreated?.(message.data)
        break
      case 'task:moved':
        onTaskMoved?.(message.data)
        break
      case 'task:updated':
        onTaskUpdated?.(message.data)
        break
      case 'task:deleted':
        onTaskDeleted?.(message.data)
        break
      case 'comment:created':
        onCommentCreated?.(message.data)
        break
      case 'comment:updated':
        onCommentUpdated?.(message.data)
        break
      case 'comment:deleted':
        onCommentDeleted?.(message.data)
        break
      case 'user:joined':
        onUserJoined?.(message.data)
        break
      case 'user:left':
        onUserLeft?.(message.data)
        break
      case 'presence:update':
        onPresenceUpdate?.(message.data)
        break
      case 'pong':
        break
      default:
        console.log('Unknown WebSocket event:', message.event)
    }
  }

  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.error('Max reconnect attempts reached')
      return
    }

    const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts.current)
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttempts.current++
      connect()
    }, delay)
  }, [connect])

  const send = useCallback((event: string, data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, data }))
    }
  }, [])

  const setPresence = useCallback((status: 'online' | 'away' | 'busy') => {
    send('presence:set', { status })
  }, [send])

  const ping = useCallback(() => {
    send('ping', { timestamp: Date.now() })
  }, [send])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  return {
    isConnected,
    send,
    setPresence,
    ping,
  }
}