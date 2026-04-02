"use client"

import { useEffect, useRef } from "react"
import { FileText, Trash2, Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api"
import { formatBytes, formatRelative } from "@/lib/utils"
import type { Artefact } from "@/lib/types"

interface ArtefactRowProps {
  artefact: Artefact
  projectId: string
  onStatusUpdate: (id: string, status: string, error?: string) => void
  onDeleted: (id: string) => void
  onRoleChanged: (id: string, role: string) => void
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  parsing: "Parsing...",
  indexing: "Indexing...",
  ready: "Ready",
  error: "Error",
}

function StatusBadge({ status, error }: { status: string; error?: string | null }) {
  if (status === "ready") return <Badge variant="success">Ready</Badge>
  if (status === "error") return <Badge variant="destructive" title={error || ""}>Error</Badge>
  if (status === "pending") return <Badge variant="secondary">Pending</Badge>
  return (
    <Badge variant="outline" className="gap-1">
      <Loader2 className="w-3 h-3 animate-spin" />
      {STATUS_LABELS[status] || status}
    </Badge>
  )
}

export function ArtefactRow({
  artefact,
  projectId,
  onStatusUpdate,
  onDeleted,
  onRoleChanged,
}: ArtefactRowProps) {
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (artefact.parse_status === "ready" || artefact.parse_status === "error") {
      return
    }
    // Poll until ready or error
    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.get<{ data: { parse_status: string; parse_error?: string } }>(
          `/projects/${projectId}/artefacts/${artefact.id}/status`
        )
        const { parse_status, parse_error } = res.data
        onStatusUpdate(artefact.id, parse_status, parse_error)
        if (parse_status === "ready" || parse_status === "error") {
          if (pollingRef.current) clearInterval(pollingRef.current)
        }
      } catch {
        if (pollingRef.current) clearInterval(pollingRef.current)
      }
    }, 2000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [artefact.id, artefact.parse_status])

  const handleDelete = async () => {
    if (!confirm(`Delete "${artefact.original_name}"?`)) return
    try {
      await api.delete(`/projects/${projectId}/artefacts/${artefact.id}`)
      onDeleted(artefact.id)
    } catch (e) {
      console.error(e)
    }
  }

  const handleRoleChange = async (role: string) => {
    try {
      await api.patch(`/projects/${projectId}/artefacts/${artefact.id}`, { role })
      onRoleChanged(artefact.id, role)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{artefact.original_name}</p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(artefact.file_size_bytes)}
          {artefact.page_count ? ` · ${artefact.page_count} pages` : ""}
          {" · "}{formatRelative(artefact.uploaded_at)}
        </p>
      </div>

      <Select value={artefact.role} onValueChange={handleRoleChange}>
        <SelectTrigger className="w-36 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="questionnaire">Questionnaire</SelectItem>
          <SelectItem value="supporting">Supporting</SelectItem>
          <SelectItem value="pitch">Pitch</SelectItem>
        </SelectContent>
      </Select>

      <StatusBadge status={artefact.parse_status} error={artefact.parse_error} />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={handleDelete}
      >
        <Trash2 className="w-4 h-4 text-muted-foreground" />
      </Button>
    </div>
  )
}
