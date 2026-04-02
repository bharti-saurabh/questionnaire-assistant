"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FolderOpen, Settings, Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { LLMConfigModal } from "@/components/settings/LLMConfigModal"

export function Sidebar() {
  const pathname = usePathname()
  const [showLLMConfig, setShowLLMConfig] = useState(false)

  return (
    <>
      <aside className="w-16 flex flex-col items-center py-4 bg-card border-r border-border gap-4">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center mb-2">
          <span className="text-primary-foreground font-bold text-sm">QA</span>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          <Link
            href="/projects"
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
              pathname.startsWith("/projects")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            )}
            title="Projects"
          >
            <FolderOpen className="w-5 h-5" />
          </Link>
        </nav>

        <button
          onClick={() => setShowLLMConfig(true)}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          title="LLM Configuration"
        >
          <Bot className="w-5 h-5" />
        </button>

        <Link
          href="#"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </aside>

      <LLMConfigModal open={showLLMConfig} onClose={() => setShowLLMConfig(false)} />
    </>
  )
}
