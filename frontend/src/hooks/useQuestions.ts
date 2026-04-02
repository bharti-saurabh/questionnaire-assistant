import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import type { Question } from "@/lib/types"

export function useQuestions(projectId: string, statusFilter?: string) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    setLoading(true)
    try {
      const params = statusFilter ? `?status=${statusFilter}` : ""
      const res = await api.get<{ data: Question[] }>(`/projects/${projectId}/questions${params}`)
      setQuestions(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch()
  }, [projectId, statusFilter])

  return { questions, loading, refetch: fetch, setQuestions }
}
