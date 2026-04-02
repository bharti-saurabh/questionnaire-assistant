import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import type { Artefact } from "@/lib/types"

export function useArtefacts(projectId: string) {
  const [artefacts, setArtefacts] = useState<Artefact[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    try {
      const res = await api.get<{ data: Artefact[] }>(`/projects/${projectId}/artefacts`)
      setArtefacts(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch()
  }, [projectId])

  return { artefacts, loading, refetch: fetch, setArtefacts }
}
