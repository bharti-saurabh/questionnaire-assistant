"use client"

import { ArtefactRow } from "./ArtefactRow"
import type { Artefact } from "@/lib/types"

interface ArtefactListProps {
  artefacts: Artefact[]
  projectId: string
  onStatusUpdate: (id: string, status: string, error?: string) => void
  onDeleted: (id: string) => void
  onRoleChanged: (id: string, role: string) => void
}

export function ArtefactList({
  artefacts,
  projectId,
  onStatusUpdate,
  onDeleted,
  onRoleChanged,
}: ArtefactListProps) {
  if (artefacts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No artefacts uploaded yet
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {artefacts.map((artefact) => (
        <ArtefactRow
          key={artefact.id}
          artefact={artefact}
          projectId={projectId}
          onStatusUpdate={onStatusUpdate}
          onDeleted={onDeleted}
          onRoleChanged={onRoleChanged}
        />
      ))}
    </div>
  )
}
