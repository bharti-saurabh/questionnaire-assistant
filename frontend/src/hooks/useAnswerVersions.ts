import { useState, useCallback } from "react"
import { api } from "@/lib/api"
import type { Answer } from "@/lib/types"

export function useAnswerVersions(projectId: string, questionId: string) {
  const [versions, setVersions] = useState<Answer[]>([])
  const [loading, setLoading] = useState(false)

  const fetchVersions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: Answer[] }>(
        `/projects/${projectId}/questions/${questionId}/answers`
      )
      setVersions(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [projectId, questionId])

  const revert = useCallback(
    async (answerId: string) => {
      const res = await api.post<{ data: Answer }>(
        `/projects/${projectId}/questions/${questionId}/answers/${answerId}/revert`
      )
      return res.data
    },
    [projectId, questionId]
  )

  return { versions, loading, fetchVersions, revert }
}
