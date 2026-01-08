"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle2, XCircle, FileText, Loader2, Download, Eye } from "lucide-react"
import Image from "next/image"
import { parseSupabasePath } from "@/lib/supabase/utils"
import { toast } from "sonner"

interface Document {
  id: string
  type: string
  fileName: string | null
  fileUrl: string
  status: string
  reviewNote: string | null
  createdAt: string
}

interface AdminDocReviewProps {
  document: Document
  onReview: (docId: string, status: "APPROVED" | "REJECTED", note: string) => Promise<void>
}

function getDocumentLabel(type: string): string {
  switch (type) {
    case "DRIVER_PHOTO":
      return "Driver Photo"
    case "CERTIFIED_ID":
      return "Certified ID"
    case "PROOF_OF_RESIDENCE":
      return "Proof of Residence"
    default:
      return type.replace(/_/g, " ")
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

async function getSignedUrl(bucket: string, path: string): Promise<string> {
  const res = await fetch(`/api/files/signed-url?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}&expiresIn=300`)
  const data = await res.json()
  if (!data.url) {
    throw new Error(data.error || "Failed to get signed URL")
  }
  return data.url
}

async function downloadFile(bucket: string, path: string, fileName: string | null) {
  try {
    const signedUrl = await getSignedUrl(bucket, path)
    const fileRes = await fetch(signedUrl)
    if (!fileRes.ok) {
      throw new Error(`Failed to fetch file: ${fileRes.statusText}`)
    }
    const blob = await fileRes.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName || "document"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error: any) {
    console.error("Download failed:", error)
    toast.error(error.message || "Failed to download document")
    throw error
  }
}

async function openDocument(bucket: string, path: string) {
  try {
    const signedUrl = await getSignedUrl(bucket, path)
    window.open(signedUrl, "_blank", "noopener,noreferrer")
  } catch (error: any) {
    console.error("Open document failed:", error)
    toast.error(error.message || "Failed to open document")
  }
}

export function AdminDocReview({ document, onReview }: AdminDocReviewProps) {
  const [reviewing, setReviewing] = useState(false)
  const [note, setNote] = useState("")
  const [loadingUrl, setLoadingUrl] = useState(false)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)

  const handleReview = async (status: "APPROVED" | "REJECTED") => {
    setReviewing(true)
    try {
      await onReview(document.id, status, note)
      setNote("")
    } catch (error) {
      console.error("Review failed:", error)
    } finally {
      setReviewing(false)
    }
  }

  // Parse bucket and path from fileUrl
  const parsed = parseSupabasePath(document.fileUrl)
  const bucket = parsed?.bucket || "driver-kyc"
  const path = parsed?.path || document.fileUrl

  // Determine file type from path
  const isImage = path.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  const isPDF = path.match(/\.pdf$/i)

  // Load thumbnail for images (using signed URL)
  const loadThumbnail = async () => {
    if (!isImage || thumbnailUrl) return
    
    setLoadingUrl(true)
    try {
      const signedUrl = await getSignedUrl(bucket, path)
      setThumbnailUrl(signedUrl)
    } catch (error: any) {
      console.error("Failed to load thumbnail:", error)
      // Don't show toast for thumbnail failures, just log
    } finally {
      setLoadingUrl(false)
    }
  }

  // Load thumbnail on mount for images
  useEffect(() => {
    if (isImage) {
      loadThumbnail()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isImage])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-700 border-green-200"
      case "REJECTED":
        return "bg-red-100 text-red-700 border-red-200"
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Document Header */}
        <div className="flex items-start gap-4">
          {/* Thumbnail or Icon */}
          <div className="flex-shrink-0">
            {isImage ? (
              <div className="relative w-24 h-24 rounded-lg border overflow-hidden bg-secondary/30">
                {loadingUrl ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : thumbnailUrl ? (
                  <Image
                    src={thumbnailUrl}
                    alt={getDocumentLabel(document.type)}
                    width={96}
                    height={96}
                    className="object-cover w-full h-full cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => openDocument(bucket, path)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-24 h-24 rounded-lg border flex items-center justify-center bg-secondary/30">
                {isPDF ? (
                  <FileText className="h-12 w-12 text-red-600" />
                ) : (
                  <FileText className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
            )}
          </div>

          {/* Document Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-base">{getDocumentLabel(document.type)}</h3>
                {document.fileName && (
                  <p className="text-sm text-muted-foreground truncate">{document.fileName}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Uploaded: {formatDate(document.createdAt)}
                </p>
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded border whitespace-nowrap ${getStatusColor(document.status)}`}
              >
                {document.status}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openDocument(bucket, path)}
                disabled={loadingUrl}
                className="flex items-center gap-1"
              >
                {loadingUrl ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadFile(bucket, path, document.fileName)}
                disabled={loadingUrl}
                className="flex items-center gap-1"
              >
                {loadingUrl ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
                Download
              </Button>
            </div>
          </div>
        </div>

        {/* Review Note (if exists) */}
        {document.reviewNote && (
          <div className="p-3 bg-secondary rounded-md border-l-2 border-primary">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Review Note:</span> {document.reviewNote}
            </p>
          </div>
        )}

        {/* Approve/Reject Controls (only for PENDING) */}
        {document.status === "PENDING" && (
          <div className="space-y-3 pt-3 border-t">
            <div className="space-y-2">
              <Label htmlFor={`note-${document.id}`}>Review Note (Optional)</Label>
              <Textarea
                id={`note-${document.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any comments about this document..."
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleReview("APPROVED")}
                disabled={reviewing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {reviewing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleReview("REJECTED")}
                disabled={reviewing}
                variant="destructive"
                className="flex-1"
              >
                {reviewing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
