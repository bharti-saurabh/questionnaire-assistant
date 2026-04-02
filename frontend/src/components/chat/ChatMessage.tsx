import { cn } from "@/lib/utils"
import type { ChatMessage as ChatMessageType } from "@/lib/types"
import { FileText } from "lucide-react"

interface ChatMessageProps {
  message: ChatMessageType
  isStreaming?: boolean
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-primary">AI</span>
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted rounded-tl-sm"
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {isStreaming && (
          <span className="inline-block w-1.5 h-3.5 bg-current opacity-70 animate-pulse ml-0.5 align-middle" />
        )}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
            {message.citations.map((cit, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs opacity-70">
                <FileText className="w-3 h-3 shrink-0" />
                <span>{cit.artefact_name} · p.{cit.page}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
