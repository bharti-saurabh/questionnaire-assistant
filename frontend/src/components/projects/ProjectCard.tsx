"use client"

import Link from "next/link"
import { MoreHorizontal, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import { formatDate, daysUntil } from "@/lib/utils"
import type { Project } from "@/lib/types"

interface ProjectCardProps {
  project: Project
  onRefresh: () => void
}

export function ProjectCard({ project, onRefresh }: ProjectCardProps) {
  const metrics = project.metrics
  const answered = metrics?.answered_count ?? 0
  const total = metrics?.approved_count ?? 0
  const progress = total > 0 ? Math.round((answered / total) * 100) : 0

  const handleDelete = async () => {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/projects/${project.id}`)
      onRefresh()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-semibold leading-tight">
            <Link
              href={`/projects/${project.id}/questions`}
              className="hover:text-primary transition-colors"
            >
              {project.name}
            </Link>
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {project.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {project.description}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {total > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{answered} of {total} answered</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Created {formatDate(project.created_at)}</span>
          {project.deadline && (
            <span className={daysUntil(project.deadline) < 3 ? "text-destructive font-medium" : ""}>
              {daysUntil(project.deadline) >= 0
                ? `${daysUntil(project.deadline)}d left`
                : "Overdue"}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
