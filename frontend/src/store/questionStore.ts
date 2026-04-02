import { create } from "zustand"
import type { Question } from "@/lib/types"

interface QuestionStore {
  selectedQuestion: Question | null
  setSelectedQuestion: (q: Question | null) => void
}

export const useQuestionStore = create<QuestionStore>((set) => ({
  selectedQuestion: null,
  setSelectedQuestion: (q) => set({ selectedQuestion: q }),
}))
