import { useEffect } from "react"
import { api } from "@/lib/api"
import { useLLMConfigStore } from "@/store/llmConfigStore"
import type { LLMConfig } from "@/lib/types"

export function useLLMConfig() {
  const { config, setConfig } = useLLMConfigStore()

  useEffect(() => {
    if (!config) {
      api.get<{ data: LLMConfig }>("/llm-config")
        .then((res) => setConfig(res.data))
        .catch(() => {})
    }
  }, [])

  const save = async (updates: Partial<LLMConfig> & { api_key?: string }) => {
    const res = await api.put<{ data: LLMConfig }>("/llm-config", updates)
    setConfig(res.data)
    return res.data
  }

  const test = async () => {
    return api.post<{ data: { ok: boolean; latency_ms: number; error?: string } }>("/llm-config/test")
  }

  return { config, save, test }
}
