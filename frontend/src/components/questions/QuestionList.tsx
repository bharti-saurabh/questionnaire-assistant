"use client"

import { useState } from "react"
import { QuestionItem } from "./QuestionItem"
import { QuestionFilters } from "./QuestionFilters"
import type { Question } from "@/lib/types"

interface QuestionListProps {
  questions: Question[]
  loading: boolean
  selectedId?: string
  onSelect: (q: Question) => void
}

type FilterStatus = "all" | "approved" | "in_progress" | "answered" | "skipped"

export function QuestionList({ questions, loading, selectedId, onSelect }: QuestionListProps) {
  const [filter, setFilter] = useState<FilterStatus>("all")

  const filtered = filter === "all"
    ? questions
    : questions.filter((q) => q.status === filter)

  // Group by section
  const sections = Array.from(new Set(filtered.map((q) => q.section || ""))).sort()

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b shrink-0">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Questions
        </h2>
        <QuestionFilters active={filter} onChange={setFilter} questions={questions} />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {questions.length === 0
              ? "No questions yet. Extract from a questionnaire artefact."
              : "No questions match this filter."}
          </div>
        ) : (
          <div className="space-y-1">
            {sections.map((section) => {
              const sectionQs = filtered.filter((q) => (q.section || "") === section)
              return (
                <div key={section}>
                  {section && (
                    <p className="text-xs font-medium text-muted-foreground px-2 py-1.5 mt-2">
                      {section}
                    </p>
                  )}
                  {sectionQs.map((q) => (
                    <QuestionItem
                      key={q.id}
                      question={q}
                      isSelected={q.id === selectedId}
                      onClick={() => onSelect(q)}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
