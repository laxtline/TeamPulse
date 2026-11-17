import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch globally
global.fetch = vi.fn()

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('teamsApi', () => {
    it('should fetch teams list', async () => {
      const mockTeams = [
        { id: '1', name: 'Team 1', slug: 'team-1', description: 'Test team' },
        { id: '2', name: 'Team 2', slug: 'team-2', description: 'Another team' },
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeams),
      })

      const { teamsApi } = await import('./api')
      const result = await teamsApi.list()

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/teams',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          credentials: 'include',
        })
      )
      expect(result).toEqual(mockTeams)
    })

    it('should create a team', async () => {
      const newTeam = { id: '3', name: 'New Team', slug: 'new-team', description: 'New team' }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newTeam),
      })

      const { teamsApi } = await import('./api')
      const result = await teamsApi.create({ name: 'New Team', description: 'New team' })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/teams',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'New Team', description: 'New team' }),
        })
      )
      expect(result).toEqual(newTeam)
    })
  })

  describe('tasksApi', () => {
    it('should fetch tasks for a project', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', status: 'todo', priority: 'medium' },
        { id: '2', title: 'Task 2', status: 'in_progress', priority: 'high' },
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTasks),
      })

      const { tasksApi } = await import('./api')
      const result = await tasksApi.list('project-1')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/projects/project-1/tasks',
        expect.any(Object)
      )
      expect(result).toEqual(mockTasks)
    })

    it('should create a task', async () => {
      const newTask = { id: '3', title: 'New Task', status: 'backlog', priority: 'medium' }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newTask),
      })

      const { tasksApi } = await import('./api')
      const result = await tasksApi.create('project-1', {
        title: 'New Task',
        status: 'backlog',
        priority: 'medium',
      })

      expect(result).toEqual(newTask)
    })
  })

  describe('aiApi', () => {
    it('should predict priority', async () => {
      const mockPrediction = {
        priority: 'high',
        confidence: 0.85,
        reasoning: 'This task has high impact',
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPrediction),
      })

      const { aiApi } = await import('./api')
      const result = await aiApi.predictPriority({
        title: 'Important task',
        description: 'This is very important',
        project_key: 'TEST',
      })

      expect(result).toEqual(mockPrediction)
    })
  })
})