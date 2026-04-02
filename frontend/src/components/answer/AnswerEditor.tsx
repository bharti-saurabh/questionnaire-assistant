"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Pencil, Eye } from "lucide-react"

interface AnswerEditorProps {
  content: string
  onChange: (content: string) => void
  readOnly?: boolean
  manualEdit?: boolean
  onToggleEdit?: () => void
}

export function AnswerEditor({
  content,
  onChange,
  readOnly = false,
  manualEdit = false,
  onToggleEdit,
}: AnswerEditorProps) {
  const [preview, setPreview] = useState(false)

  return (
    <div className="px-4 pt-3 pb-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Draft Answer
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setPreview((v) => !v)}
          >
            <Eye className="w-3 h-3 mr-1" />
            {preview ? "Edit" : "Preview"}
          </Button>
          {onToggleEdit && !readOnly && (
            <Button
              variant={manualEdit ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onToggleEdit}
            >
              <Pencil className="w-3 h-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {preview ? (
        <div className="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-lg p-3 min-h-[100px]">
          {content}
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly && !manualEdit}
          className={cn(
            "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[120px]",
            (readOnly && !manualEdit) && "opacity-80 cursor-default"
          )}
          rows={6}
        />
      )}
    </div>
  )
}
