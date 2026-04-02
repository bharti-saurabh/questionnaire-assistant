"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { AppShell } from "@/components/layout/AppShell"
import { QuestionList } from "@/components/questions/QuestionList"
import { ChatPanel } from "@/components/chat/ChatPanel"
import { TrackerPanel } from "@/components/tracker/TrackerPanel"
import { QuestionExtractor } from "@/components/questions/QuestionExtractor"
import { api } from "@/lib/api"
import type { Project, Question, Artefact } from "@/lib/types"
import { useQuestionStore } from "@/store/questionStore"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function QuestionsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [artefacts, setArtefacts] = useState<Artefact[]>([])
  const [loading, setLoading] = useState(true)
  const { selectedQuestion, setSelectedQuestion } = useQuestionStore()

  const fetchAll = useCallback(async () => {
    try {
      const [projRes, qRes, artRes] = await Promise.all([
        api.get<{ data: Project }>(`/projects/${projectId}`),
        api.get<{ data: Question[] }>(`/projects/${projectId}/questions?status=approved,in_progress,answered,skipped`),
        api.get<{ data: Artefact[] }>(`/projects/${projectId}/artefacts`),
      ])
      setProject(projRes.data)
      setQuestions(qRes.data)
      setArtefacts(artRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleQuestionAnswered = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, status: "answered" as const } : q))
    )
    fetchAll() // refresh metrics
  }

  const handleQuestionInProgress = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, status: "in_progress" as const } : q))
    )
  }

  return (
    <AppShell>
      <div className="flex flex-col h-screen">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-sm truncate max-w-xs">
              {project?.name ?? "Loading..."}
            </h1>
            <QuestionExtractor
              projectId={projectId}
              artefacts={artefacts}
              onExtracted={fetchAll}
            />
          </div>
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/projects/${projectId}/settings`}>
              <Settings className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Three-panel layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Question list */}
          <div className="w-72 shrink-0 border-r overflow-y-auto">
            <QuestionList
              questions={questions}
              loading={loading}
              selectedId={selectedQuestion?.id}
              onSelect={setSelectedQuestion}
            />
          </div>

          {/* Center: Chat / Answer */}
          <div className="flex-1 overflow-hidden">
            {selectedQuestion ? (
              <ChatPanel
                projectId={projectId}
                question={selectedQuestion}
                onAnswered={handleQuestionAnswered}
                onInProgress={handleQuestionInProgress}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <p className="font-medium">Select a question to begin</p>
                  <p className="text-sm mt-1">Choose from the list on the left</p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Tracker */}
          <div className="w-72 shrink-0 border-l overflow-y-auto">
            <TrackerPanel
              project={project}
              questions={questions}
              projectId={projectId}
            />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
