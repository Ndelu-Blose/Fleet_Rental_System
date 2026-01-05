"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

interface DocumentUploaderProps {
  docType: string
  label: string
  onUpload: (file: File) => Promise<void>
  existingDoc?: {
    fileName: string
    status: string
  }
}

export function DocumentUploader({ docType, label, onUpload, existingDoc }: DocumentUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    try {
      await onUpload(file)
      setFile(null)
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      setUploading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "text-green-600"
      case "REJECTED":
        return "text-red-600"
      default:
        return "text-yellow-600"
    }
  }

  return (
    <Card className="p-4">
      <Label className="text-sm font-medium mb-2 block">{label}</Label>

      {existingDoc ? (
        <div className="flex items-center gap-2 p-3 bg-secondary rounded-md">
          <FileText className="h-4 w-4" />
          <span className="text-sm flex-1">{existingDoc.fileName}</span>
          <span className={`text-xs font-medium ${getStatusColor(existingDoc.status)}`}>{existingDoc.status}</span>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="file"
            id={`file-${docType}`}
            className="hidden"
            onChange={handleFileChange}
            accept="image/*,application/pdf"
          />
          <label
            htmlFor={`file-${docType}`}
            className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-md cursor-pointer hover:bg-secondary/50 transition-colors"
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{file ? file.name : "Choose file"}</span>
          </label>

          {file && (
            <Button onClick={handleUpload} disabled={uploading} className="w-full">
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload Document"
              )}
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
