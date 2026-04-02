"use client"

import { useEffect, useRef, useState } from "react"
import { useChat } from "@/hooks/useChat"
import { ChatMessage } from "./ChatMessage"
import { ChatInput } from "./ChatInput"
import { AnswerEditor } from "../answer/AnswerEditor"
import { AnswerActions } from "../answer/AnswerActions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import type { Question } from "@/lib/types"
import { api } from "@/lib/api"

interface ChatPanelProps {
  projectId: string
  question: Question
  onAnswered: (questionId: string) => void
  onInProgress: (questionId: string) => void
}

export function ChatPanel({ projectId, question, onAnswered, onInProgress }: ChatPanelProps) {
  const {
    session,
    messages,
    streaming,
    streamingContent,
    phase,
    answerDraft,
    setAnswerDraft,
    initSession,
    sendMessage,
    generateAnswer,
  } = useChat(projectId, question.id)

  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null)
  const [committedAnswer, setCommittedAnswer] = useState<string | null>(null)
  const [manualEdit, setManualEdit] = useState(false)
  const [committing, setCommitting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    initSession()
    onInProgress(question.id)
  }, [question.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  useEffect(() => {
    if (answerDraft && !currentAnswer) {
      setCurrentAnswer(answerDraft)
    }
  }, [answerDraft])

  const handleCommit = async (content: string, source: string = "ai") => {
    setCommitting(true)
    try {
      await api.post(`/projects/${projectId}/questions/${question.id}/answers`, {
        content,
        source,
        session_id: session?.id,
      })
      setCommittedAnswer(content)
      onAnswered(question.id)
    } catch (e) {
      console.error(e)
    } finally {
      setCommitting(false)
    }
  }

  const handleRequestChanges = async (request: string) => {
    setCurrentAnswer(null)
    setAnswerDraft(null)
    await sendMessage(request)
  }

  const phaseLabel = phase === "clarifying" ? "Clarifying" : phase === "answering" ? "Generating..." : "Review"
  const phaseVariant = phase === "clarifying" ? "secondary" : phase === "answering" ? "warning" : "success"

  return (
    <div className="flex flex-col h-full">
      {/* Question header */}
      <div className="px-4 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-muted-foreground">Q{question.number}</span>
          {question.section && (
            <Badge variant="secondary" className="text-xs">{question.section}</Badge>
          )}
          <Badge variant={phaseVariant as any} className="text-xs ml-auto">{phaseLabel}</Badge>
        </div>
        <p className="text-sm font-medium leading-snug">{question.text}</p>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && !streaming && phase === "clarifying" && (
          <div className="text-center text-sm text-muted-foreground pt-8">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Start by describing your context, or let the AI ask clarifying questions.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => sendMessage("Please ask me the clarifying questions you need to write a great answer.")}
            >
              Let AI ask questions
            </Button>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {streaming && streamingContent && (
          <ChatMessage
            message={{
              id: "streaming",
              session_id: session?.id || "",
              role: "assistant",
              content: streamingContent,
              phase,
              citations: [],
              created_at: new Date().toISOString(),
            }}
            isStreaming
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Generate Answer button (shows after at least 1 exchange in clarifying) */}
      {phase === "clarifying" && messages.filter((m) => m.role === "user").length >= 1 && !streaming && (
        <div className="px-4 py-2 border-t shrink-0">
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={generateAnswer}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Generate Answer
          </Button>
        </div>
      )}

      {/* Answer editor (shows in review phase) */}
      {(phase === "review" || committedAnswer) && currentAnswer !== null && (
        <div className="border-t shrink-0 max-h-72 overflow-y-auto">
          <AnswerEditor
            content={currentAnswer}
            onChange={setCurrentAnswer}
            readOnly={!!committedAnswer && !manualEdit}
            manualEdit={manualEdit}
            onToggleEdit={() => setManualEdit((v) => !v)}
          />
          {!committedAnswer && (
            <AnswerActions
              onCommit={() => handleCommit(currentAnswer, manualEdit ? "ai_edited" : "ai")}
              onRequestChanges={handleRequestChanges}
              onManualEdit={() => setManualEdit(true)}
              committing={committing}
              manualEditActive={manualEdit}
            />
          )}
          {committedAnswer && (
            <div className="px-4 py-2 bg-green-50 border-t">
              <p className="text-xs text-green-700 font-medium">Answer committed</p>
            </div>
          )}
        </div>
      )}

      {/* Chat input (hidden in review phase after commit) */}
      {!committedAnswer && phase !== "answering" && (
        <div className="border-t shrink-0">
          <ChatInput
            onSend={sendMessage}
            disabled={streaming}
            placeholder={phase === "review" ? "Request changes to the answer..." : "Type your response..."}
          />
        </div>
      )}
    </div>
  )
}
