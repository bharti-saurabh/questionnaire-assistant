"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { formatDate, daysUntil } from "@/lib/utils"
import type { Project, Question } from "@/lib/types"

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"

interface TrackerPanelProps {
  project: Project | null
  questions: Question[]
  projectId: string
}

function ProgressRing({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? value / max : 0
  const r = 40
  const circ = 2 * Math.PI * r
  const dashOffset = circ * (1 - pct)

  return (
    <div className="flex flex-col items-center py-4">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="-mt-16 text-center">
        <div className="text-2xl font-bold">{Math.round(pct * 100)}%</div>
        <div className="text-xs text-muted-foreground">{value}/{max}</div>
      </div>
      <div className="mt-8 text-sm text-muted-foreground">answered</div>
    </div>
  )
}

function StatusRow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className="font-medium tabular-nums">{count}</span>
    </div>
  )
}

export function TrackerPanel({ project, questions, projectId }: TrackerPanelProps) {
  const answered = questions.filter((q) => q.status === "answered").length
  const inProgress = questions.filter((q) => q.status === "in_progress").length
  const pending = questions.filter((q) => q.status === "approved").length
  const skipped = questions.filter((q) => q.status === "skipped").length
  const total = questions.length

  const handleExport = async () => {
    try {
      const res = await fetch(`${BASE_URL}/projects/${projectId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${project?.name || "answers"}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    }
  }

  const deadlineDays = project?.deadline ? daysUntil(project.deadline) : null

  return (
    <div className="p-4 space-y-5">
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Progress
        </h3>
        <ProgressRing value={answered} max={total || 1} />
      </div>

      {project?.deadline && (
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground mb-0.5">Deadline</p>
          <p className="text-sm font-medium">{formatDate(project.deadline)}</p>
          {deadlineDays !== null && (
            <p className={`text-xs mt-1 ${deadlineDays < 3 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {deadlineDays >= 0 ? `${deadlineDays} day${deadlineDays !== 1 ? "s" : ""} remaining` : "Overdue"}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Breakdown
        </h3>
        <StatusRow label="Answered" count={answered} color="bg-green-500" />
        <StatusRow label="In Progress" count={inProgress} color="bg-yellow-500" />
        <StatusRow label="Pending" count={pending} color="bg-blue-400" />
        <StatusRow label="Skipped" count={skipped} color="bg-gray-400" />
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleExport}
        disabled={answered === 0}
      >
        <Download className="w-3.5 h-3.5 mr-1.5" />
        Download Answers (.docx)
      </Button>
    </div>
  )
}
