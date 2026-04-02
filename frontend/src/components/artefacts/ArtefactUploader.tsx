"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { cn, formatBytes } from "@/lib/utils"
import { api } from "@/lib/api"
import type { Artefact } from "@/lib/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface UploadingFile {
  file: File
  role: "questionnaire" | "supporting" | "pitch"
  status: "uploading" | "done" | "error"
  error?: string
  artefact?: Artefact
}

interface ArtefactUploaderProps {
  projectId: string
  onUploaded: (artefact: Artefact) => void
}

export function ArtefactUploader({ projectId, onUploaded }: ArtefactUploaderProps) {
  const [uploads, setUploads] = useState<UploadingFile[]>([])

  const uploadFile = async (uploadingFile: UploadingFile) => {
    const formData = new FormData()
    formData.append("file", uploadingFile.file)
    formData.append("role", uploadingFile.role)

    try {
      const res = await api.postForm<{ data: Artefact }>(
        `/projects/${projectId}/artefacts`,
        formData
      )
      setUploads((prev) =>
        prev.map((u) =>
          u.file === uploadingFile.file
            ? { ...u, status: "done", artefact: res.data }
            : u
        )
      )
      onUploaded(res.data)
    } catch (e: any) {
      setUploads((prev) =>
        prev.map((u) =>
          u.file === uploadingFile.file
            ? { ...u, status: "error", error: e.message }
            : u
        )
      )
    }
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newUploads: UploadingFile[] = acceptedFiles.map((file) => ({
        file,
        role: "supporting",
        status: "uploading",
      }))
      setUploads((prev) => [...prev, ...newUploads])
      newUploads.forEach(uploadFile)
    },
    [projectId]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/plain": [".txt"],
    },
    multiple: true,
  })

  const removeUpload = (file: File) => {
    setUploads((prev) => prev.filter((u) => u.file !== file))
  }

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium">
          {isDragActive ? "Drop files here" : "Drag & drop files here"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, DOCX, XLSX, TXT — click to browse
        </p>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((u, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{u.file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(u.file.size)}</p>
              </div>

              {u.status === "uploading" && (
                <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              )}
              {u.status === "done" && (
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              )}
              {u.status === "error" && (
                <div className="flex items-center gap-1 text-destructive shrink-0">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs">{u.error}</span>
                </div>
              )}

              <button
                onClick={() => removeUpload(u.file)}
                className="p-1 rounded hover:bg-muted shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
