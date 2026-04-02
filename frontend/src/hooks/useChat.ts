import { useState, useRef, useCallback } from "react"
import type { ChatMessage, ChatSession, Citation } from "@/lib/types"

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"

export type ChatPhase = "clarifying" | "answering" | "review"

export interface StreamEvent {
  type: "token" | "citation" | "phase_change" | "answer_draft" | "done" | "error"
  content?: string
  phase?: ChatPhase
  artefact_id?: string
  artefact_name?: string
  page?: number
  snippet?: string
  message_id?: string
  ready_to_answer?: boolean
  message?: string
}

export function useChat(projectId: string, questionId: string) {
  const [session, setSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [phase, setPhase] = useState<ChatPhase>("clarifying")
  const [answerDraft, setAnswerDraft] = useState<string | null>(null)
  const [pendingCitations, setPendingCitations] = useState<Citation[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const initSession = useCallback(async () => {
    const res = await fetch(
      `${BASE_URL}/projects/${projectId}/questions/${questionId}/sessions`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
    )
    const data = await res.json()
    setSession(data.data)

    // Load existing messages
    const msgRes = await fetch(
      `${BASE_URL}/projects/${projectId}/questions/${questionId}/sessions/${data.data.id}/messages`
    )
    const msgData = await msgRes.json()
    setMessages(msgData.data || [])
    setPhase(data.data.phase as ChatPhase)

    return data.data as ChatSession
  }, [projectId, questionId])

  const streamFromUrl = useCallback(
    async (url: string, body: object, onDone?: (event: StreamEvent) => void) => {
      abortRef.current = new AbortController()
      setStreaming(true)
      setStreamingContent("")
      setPendingCitations([])

      let accumulated = ""
      const localCitations: Citation[] = []

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: abortRef.current.signal,
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        if (!res.body) throw new Error("No response body")

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            const raw = line.slice(6).trim()
            if (!raw) continue

            try {
              const event: StreamEvent = JSON.parse(raw)

              if (event.type === "token" && event.content) {
                accumulated += event.content
                setStreamingContent(accumulated)
              } else if (event.type === "citation") {
                const cit: Citation = {
                  artefact_id: event.artefact_id!,
                  artefact_name: event.artefact_name!,
                  page: event.page!,
                  snippet: event.snippet!,
                }
                localCitations.push(cit)
                setPendingCitations((prev) => [...prev, cit])
              } else if (event.type === "phase_change" && event.phase) {
                setPhase(event.phase)
              } else if (event.type === "answer_draft" && event.content) {
                setAnswerDraft(event.content)
              } else if (event.type === "done") {
                // Finalise: add assembled message to list
                if (accumulated) {
                  const newMsg: ChatMessage = {
                    id: event.message_id || Date.now().toString(),
                    session_id: session?.id || "",
                    role: "assistant",
                    content: accumulated,
                    phase: phase,
                    citations: localCitations,
                    created_at: new Date().toISOString(),
                  }
                  setMessages((prev) => [...prev, newMsg])
                }
                setStreamingContent("")
                onDone?.(event)
              } else if (event.type === "error") {
                console.error("Stream error:", event.message)
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      } catch (e: any) {
        if (e.name !== "AbortError") {
          console.error("Stream failed:", e)
        }
      } finally {
        setStreaming(false)
        setStreamingContent("")
      }
    },
    [session, phase]
  )

  const sendMessage = useCallback(
    async (content: string) => {
      if (!session) return

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        session_id: session.id,
        role: "user",
        content,
        phase,
        citations: [],
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])

      const url = `${BASE_URL}/projects/${projectId}/questions/${questionId}/sessions/${session.id}/messages`
      await streamFromUrl(url, { content })
    },
    [session, projectId, questionId, streamFromUrl, phase]
  )

  const generateAnswer = useCallback(async () => {
    if (!session) return
    const url = `${BASE_URL}/projects/${projectId}/questions/${questionId}/sessions/${session.id}/generate-answer`
    await streamFromUrl(url, {})
  }, [session, projectId, questionId, streamFromUrl])

  return {
    session,
    messages,
    streaming,
    streamingContent,
    phase,
    answerDraft,
    setAnswerDraft,
    pendingCitations,
    initSession,
    sendMessage,
    generateAnswer,
  }
}
