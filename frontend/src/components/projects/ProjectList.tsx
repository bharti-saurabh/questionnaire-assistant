import { ProjectCard } from "./ProjectCard"
import type { Project } from "@/lib/types"

interface ProjectListProps {
  projects: Project[]
  onRefresh: () => void
}

export function ProjectList({ projects, onRefresh }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-lg font-medium">No projects yet</p>
        <p className="text-sm mt-1">Create your first project to get started</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} onRefresh={onRefresh} />
      ))}
    </div>
  )
}
