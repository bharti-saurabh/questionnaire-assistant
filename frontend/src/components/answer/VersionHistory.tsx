"use client"

import { useEffect } from "react"
import { useAnswerVersions } from "@/hooks/useAnswerVersions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatRelative } from "@/lib/utils"
import { RotateCcw, X } from "lucide-react"
import type { Answer } from "@/lib/types"

interface VersionHistoryProps {
  projectId: string
  questionId: string
  onRevert: (answer: Answer) => void
  onClose: () => void
}

const SOURCE_LABELS: Record<string, string> = {
  ai: "AI Generated",
  manual: "Manual",
  ai_edited: "AI + Edited",
}

export function VersionHistory({ projectId, questionId, onRevert, onClose }: VersionHistoryProps) {
  const { versions, loading, fetchVersions, revert } = useAnswerVersions(projectId, questionId)

  useEffect(() => {
    fetchVersions()
  }, [questionId])

  const handleRevert = async (answer: Answer) => {
    try {
      const reverted = await revert(answer.id)
      onRevert(reverted)
      onClose()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-background border-l shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Version History</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No committed versions yet</p>
        ) : (
          versions.map((v) => (
            <div key={v.id} className={`p-3 rounded-lg border ${v.is_current ? "border-primary bg-primary/5" : ""}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">v{v.version}</span>
                  {v.is_current && <Badge variant="success" className="text-[10px]">Current</Badge>}
                  <Badge variant="secondary" className="text-[10px]">
                    {SOURCE_LABELS[v.source] || v.source}
                  </Badge>
                </div>
                {!v.is_current && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleRevert(v)}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Revert
                  </Button>
                )}
              </div>
              {v.change_summary && (
                <p className="text-xs text-muted-foreground mb-1">{v.change_summary}</p>
              )}
              <p className="text-xs text-foreground/80 line-clamp-3">{v.content}</p>
              <p className="text-[10px] text-muted-foreground mt-1.5">{formatRelative(v.created_at)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
