"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle, RefreshCw, Pencil } from "lucide-react"

interface AnswerActionsProps {
  onCommit: () => void
  onRequestChanges: (request: string) => void
  onManualEdit: () => void
  committing: boolean
  manualEditActive: boolean
}

export function AnswerActions({
  onCommit,
  onRequestChanges,
  onManualEdit,
  committing,
  manualEditActive,
}: AnswerActionsProps) {
  const [changeRequest, setChangeRequest] = useState("")
  const [showChangeInput, setShowChangeInput] = useState(false)

  const handleRequestChanges = () => {
    if (!changeRequest.trim()) return
    onRequestChanges(changeRequest.trim())
    setChangeRequest("")
    setShowChangeInput(false)
  }

  return (
    <div className="px-4 pb-3 space-y-2">
      {showChangeInput && (
        <div className="flex gap-2">
          <Input
            value={changeRequest}
            onChange={(e) => setChangeRequest(e.target.value)}
            placeholder="Describe what to change..."
            className="text-sm h-9"
            onKeyDown={(e) => e.key === "Enter" && handleRequestChanges()}
            autoFocus
          />
          <Button size="sm" onClick={handleRequestChanges} disabled={!changeRequest.trim()}>
            Send
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowChangeInput(false)}>
            Cancel
          </Button>
        </div>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onCommit}
          disabled={committing}
          className="flex-1"
        >
          <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
          {committing ? "Committing..." : "Commit Answer"}
        </Button>
        {!showChangeInput && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowChangeInput(true)}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Request Changes
          </Button>
        )}
        {!manualEditActive && (
          <Button size="sm" variant="outline" onClick={onManualEdit}>
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
        )}
      </div>
    </div>
  )
}
