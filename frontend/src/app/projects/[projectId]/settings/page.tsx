"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { AppShell } from "@/components/layout/AppShell"
import { ArtefactUploader } from "@/components/artefacts/ArtefactUploader"
import { ArtefactList } from "@/components/artefacts/ArtefactList"
import { api } from "@/lib/api"
import type { Project, Artefact } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [artefacts, setArtefacts] = useState<Artefact[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [projRes, artRes] = await Promise.all([
        api.get<{ data: Project }>(`/projects/${projectId}`),
        api.get<{ data: Artefact[] }>(`/projects/${projectId}/artefacts`),
      ])
      setProject(projRes.data)
      setArtefacts(artRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [projectId])

  const handleUploaded = (artefact: Artefact) => {
    setArtefacts((prev) => [artefact, ...prev])
  }

  const handleStatusUpdate = (id: string, status: string, error?: string) => {
    setArtefacts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, parse_status: status as any, parse_error: error || null } : a))
    )
  }

  const handleDeleted = (id: string) => {
    setArtefacts((prev) => prev.filter((a) => a.id !== id))
  }

  const handleRoleChanged = (id: string, role: string) => {
    setArtefacts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, role: role as any } : a))
    )
  }

  return (
    <AppShell>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/projects/${projectId}/questions`}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{project?.name ?? "Loading..."}</h1>
            <p className="text-sm text-muted-foreground">Project Settings & Artefacts</p>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-4">Upload Artefacts</h2>
          <ArtefactUploader
            projectId={projectId}
            onUploaded={handleUploaded}
          />
        </section>

        <section>
          <h2 className="text-base font-semibold mb-4">
            Artefacts ({artefacts.length})
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <ArtefactList
              artefacts={artefacts}
              projectId={projectId}
              onStatusUpdate={handleStatusUpdate}
              onDeleted={handleDeleted}
              onRoleChanged={handleRoleChanged}
            />
          )}
        </section>
      </div>
    </AppShell>
  )
}
