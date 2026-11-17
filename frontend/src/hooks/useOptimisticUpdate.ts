import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

interface OptimisticOptions<TData, TVariables> {
  queryKey: string[]
  updateFn: (oldData: TData | undefined, variables: TVariables) => TData
  rollbackFn?: (oldData: TData | undefined) => TData
  onMutate?: (variables: TVariables) => Promise<(() => void) | void>
  onError?: (error: Error, variables: TVariables, context: any) => void
  onSuccess?: (data: TData, variables: TVariables, context: any) => void
}

export function useOptimisticUpdate<TData, TVariables>({
  queryKey,
  updateFn,
  rollbackFn,
  onMutate,
  onError,
  onSuccess,
}: OptimisticOptions<TData, TVariables>) {
  const queryClient = useQueryClient()
  const snapshotRef = useRef<TData | undefined>()

  const mutate = useCallback(
    async (variables: TVariables, mutationFn: (vars: TVariables) => Promise<TData>) => {
      await queryClient.cancelQueries({ queryKey })

      snapshotRef.current = queryClient.getQueryData<TData>(queryKey)

      queryClient.setQueryData<TData>(queryKey, (old) => updateFn(old, variables))

      let context: any
      if (onMutate) {
        context = await onMutate(variables)
      }

      try {
        const result = await mutationFn(variables)
        onSuccess?.(result, variables, context)
        return result
      } catch (error) {
        queryClient.setQueryData<TData>(queryKey, snapshotRef.current)
        if (rollbackFn) {
          queryClient.setQueryData<TData>(queryKey, (old) => rollbackFn(old))
        }
        onError?.(error as Error, variables, context)
        throw error
      } finally {
        await queryClient.invalidateQueries({ queryKey })
      }
    },
    [queryClient, queryKey, updateFn, rollbackFn, onMutate, onError, onSuccess]
  )

  return { mutate }
}