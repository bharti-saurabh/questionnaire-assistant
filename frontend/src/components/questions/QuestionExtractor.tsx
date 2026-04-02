"use client"

import { useState } from "react"
import { Sparkles, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { QuestionReviewList } from "./QuestionReviewList"
import { api } from "@/lib/api"
import type { Artefact, Question } from "@/lib/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface QuestionExtractorProps {
  projectId: string
  artefacts: Artefact[]
  onExtracted: () => void
}

export function QuestionExtractor({ projectId, artefacts, onExtracted }: QuestionExtractorProps) {
  const [extracting, setExtracting] = useState(false)
  const [pendingQuestions, setPendingQuestions] = useState<Question[]>([])
  const [showReview, setShowReview] = useState(false)
  const [polling, setPolling] = useState(false)

  const questionnaireArtefacts = artefacts.filter(
    (a) => a.role === "questionnaire" && a.parse_status === "ready"
  )

  const handleExtract = async (artefactId: string) => {
    setExtracting(true)
    try {
      await api.post(`/projects/${projectId}/extract-questions`, { artefact_id: artefactId })
      // Poll until questions appear
      setPolling(true)
      const interval = setInterval(async () => {
        try {
          const res = await api.get<{ data: Question[] }>(
            `/projects/${projectId}/extracted-questions`
          )
          if (res.data.length > 0) {
            clearInterval(interval)
            setPolling(false)
            setPendingQuestions(res.data)
            setShowReview(true)
          }
        } catch {
          clearInterval(interval)
          setPolling(false)
        }
      }, 2000)
      // Stop polling after 2 minutes
      setTimeout(() => {
        clearInterval(interval)
        setPolling(false)
        setExtracting(false)
      }, 120000)
    } catch (e: any) {
      console.error(e)
    } finally {
      setExtracting(false)
    }
  }

  const handleReviewDone = () => {
    setShowReview(false)
    setPendingQuestions([])
    onExtracted()
  }

  if (questionnaireArtefacts.length === 0) return null

  return (
    <>
      {questionnaireArtefacts.length === 1 ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleExtract(questionnaireArtefacts[0].id)}
          disabled={extracting || polling}
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          {polling ? "Extracting..." : "Extract Questions"}
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={extracting || polling}>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              {polling ? "Extracting..." : "Extract Questions"}
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {questionnaireArtefacts.map((a) => (
              <DropdownMenuItem key={a.id} onClick={() => handleExtract(a.id)}>
                {a.original_name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={showReview} onOpenChange={(o) => !o && handleReviewDone()}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Review Extracted Questions ({pendingQuestions.length})</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <QuestionReviewList
              questions={pendingQuestions}
              projectId={projectId}
              onDone={handleReviewDone}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
