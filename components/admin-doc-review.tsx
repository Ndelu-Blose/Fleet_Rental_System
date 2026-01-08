"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle2, XCircle, FileText, Loader2, Download, Eye } from "lucide-react"
import Image from "next/image"
import { getDocumentUrl } from "@/lib/supabase/utils"

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

function downloadFile(url: string, fileName: string | null) {
  const link = document.createElement("a")
  link.href = url
  link.download = fileName || "document"
  link.target = "_blank"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function AdminDocReview({ document, onReview }: AdminDocReviewProps) {
  const [reviewing, setReviewing] = useState(false)
  const [note, setNote] = useState("")

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

  // Generate proper URL from path
  const publicUrl = getDocumentUrl(document.fileUrl)
  
  // Debug logging in development
  if (process.env.NODE_ENV === "development") {
    console.log("[AdminDocReview] Document URL generation:", {
      original: document.fileUrl,
      generated: publicUrl,
      hasProtocol: publicUrl.startsWith("http"),
    })
  }
  
  const isImage = publicUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  const isPDF = publicUrl.match(/\.pdf$/i)

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
                <Image
                  src={publicUrl}
                  alt={getDocumentLabel(document.type)}
                  width={96}
                  height={96}
                  className="object-cover w-full h-full cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.open(publicUrl, "_blank")}
                />
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
                onClick={() => window.open(publicUrl, "_blank")}
                className="flex items-center gap-1"
              >
                <Eye className="h-3 w-3" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadFile(publicUrl, document.fileName)}
                className="flex items-center gap-1"
              >
                <Download className="h-3 w-3" />
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
