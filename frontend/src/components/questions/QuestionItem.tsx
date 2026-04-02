import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { Question } from "@/lib/types"

interface QuestionItemProps {
  question: Question
  isSelected: boolean
  onClick: () => void
}

const STATUS_STYLES: Record<string, string> = {
  approved: "secondary",
  in_progress: "warning",
  answered: "success",
  skipped: "outline",
}

const STATUS_LABELS: Record<string, string> = {
  approved: "Todo",
  in_progress: "In Progress",
  answered: "Done",
  skipped: "Skipped",
}

export function QuestionItem({ question, isSelected, onClick }: QuestionItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-md transition-colors group",
        isSelected
          ? "bg-primary text-primary-foreground"
          : "hover:bg-accent"
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn(
          "text-xs shrink-0 mt-0.5 font-mono",
          isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          Q{question.number}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs leading-snug line-clamp-2">{question.text}</p>
          <div className="mt-1.5">
            <Badge
              variant={STATUS_STYLES[question.status] as any || "secondary"}
              className="text-[10px] px-1.5 py-0"
            >
              {STATUS_LABELS[question.status] || question.status}
            </Badge>
          </div>
        </div>
      </div>
    </button>
  )
}
