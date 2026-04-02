import { cn } from "@/lib/utils"
import type { Question } from "@/lib/types"

type FilterStatus = "all" | "approved" | "in_progress" | "answered" | "skipped"

interface QuestionFiltersProps {
  active: FilterStatus
  onChange: (f: FilterStatus) => void
  questions: Question[]
}

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "approved", label: "Todo" },
  { key: "in_progress", label: "Active" },
  { key: "answered", label: "Done" },
  { key: "skipped", label: "Skipped" },
]

export function QuestionFilters({ active, onChange, questions }: QuestionFiltersProps) {
  const counts: Record<string, number> = { all: questions.length }
  questions.forEach((q) => {
    counts[q.status] = (counts[q.status] || 0) + 1
  })

  return (
    <div className="flex flex-wrap gap-1">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={cn(
            "text-xs px-2 py-1 rounded-md transition-colors",
            active === f.key
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent"
          )}
        >
          {f.label}
          {counts[f.key] !== undefined && (
            <span className="ml-1 opacity-70">{counts[f.key]}</span>
          )}
        </button>
      ))}
    </div>
  )
}
