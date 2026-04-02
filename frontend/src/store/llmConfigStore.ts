import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { LLMConfig } from "@/lib/types"

interface LLMConfigStore {
  config: LLMConfig | null
  setConfig: (config: LLMConfig) => void
}

export const useLLMConfigStore = create<LLMConfigStore>()(
  persist(
    (set) => ({
      config: null,
      setConfig: (config) => set({ config }),
    }),
    { name: "llm-config" }
  )
)
