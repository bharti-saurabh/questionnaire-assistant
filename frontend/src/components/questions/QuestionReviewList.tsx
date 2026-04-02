"use client"

import { useState } from "react"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import type { Question } from "@/lib/types"

interface ReviewItem {
  question: Question
  approved: boolean
  editedText: string
  editing: boolean
}

interface QuestionReviewListProps {
  questions: Question[]
  projectId: string
  onDone: () => void
}

export function QuestionReviewList({ questions, projectId, onDone }: QuestionReviewListProps) {
  const [items, setItems] = useState<ReviewItem[]>(
    questions.map((q) => ({
      question: q,
      approved: true,
      editedText: q.text,
      editing: false,
    }))
  )
  const [submitting, setSubmitting] = useState(false)

  const toggle = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.question.id === id ? { ...i, approved: !i.approved } : i))
    )
  }

  const setEditing = (id: string, val: boolean) => {
    setItems((prev) =>
      prev.map((i) => (i.question.id === id ? { ...i, editing: val } : i))
    )
  }

  const setEditedText = (id: string, text: string) => {
    setItems((prev) =>
      prev.map((i) => (i.question.id === id ? { ...i, editedText: text } : i))
    )
  }

  const approveAll = () => setItems((prev) => prev.map((i) => ({ ...i, approved: true })))
  const rejectAll = () => setItems((prev) => prev.map((i) => ({ ...i, approved: false })))

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await api.post(`/projects/${projectId}/questions/review`, {
        approvals: items.map((i) => ({
          question_id: i.question.id,
          approved: i.approved,
          text: i.editedText !== i.question.text ? i.editedText : undefined,
        })),
      })
      onDone()
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  const approvedCount = items.filter((i) => i.approved).length

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b">
        <span className="text-sm text-muted-foreground flex-1">
          {approvedCount} of {items.length} approved
        </span>
        <Button variant="outline" size="sm" onClick={approveAll}>Approve All</Button>
        <Button variant="outline" size="sm" onClick={rejectAll}>Reject All</Button>
      </div>

      {items.map((item) => (
        <div
          key={item.question.id}
          className={`flex gap-3 p-3 rounded-lg border transition-colors ${
            item.approved ? "border-green-200 bg-green-50" : "border-border bg-muted/30 opacity-60"
          }`}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {item.question.section && (
                <Badge variant="secondary" className="text-xs">{item.question.section}</Badge>
              )}
              <span className="text-xs text-muted-foreground">Q{item.question.number}</span>
            </div>
            {item.editing ? (
              <Input
                value={item.editedText}
                onChange={(e) => setEditedText(item.question.id, e.target.value)}
                onBlur={() => setEditing(item.question.id, false)}
                autoFocus
                className="text-sm"
              />
            ) : (
              <p
                className="text-sm cursor-pointer hover:text-primary"
                onClick={() => setEditing(item.question.id, true)}
                title="Click to edit"
              >
                {item.editedText}
              </p>
            )}
          </div>
          <button
            onClick={() => toggle(item.question.id)}
            className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
              item.approved
                ? "bg-green-500 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {item.approved ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>
      ))}

      <div className="pt-3 border-t flex justify-end gap-2">
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving..." : `Add ${approvedCount} Questions`}
        </Button>
      </div>
    </div>
  )
}
