"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle2, XCircle, FileText, Loader2 } from "lucide-react"
import Image from "next/image"

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

  const isImage = document.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium">{document.type.replace(/_/g, " ")}</h3>
            <p className="text-sm text-muted-foreground">{document.fileName}</p>
          </div>
          <span
            className={`text-xs font-medium px-2 py-1 rounded ${
              document.status === "APPROVED"
                ? "bg-green-100 text-green-700"
                : document.status === "REJECTED"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {document.status}
          </span>
        </div>

        <div className="border rounded-lg overflow-hidden bg-secondary/30">
          {isImage ? (
            <div className="relative w-full aspect-video">
              <Image src={document.fileUrl || "/placeholder.svg"} alt={document.type} fill className="object-contain" />
            </div>
          ) : (
            <a
              href={document.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-8 hover:bg-secondary/50 transition-colors"
            >
              <FileText className="h-8 w-8" />
              <span className="text-sm">Open Document</span>
            </a>
          )}
        </div>

        {document.status === "PENDING" && (
          <div className="space-y-3">
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

        {document.reviewNote && (
          <div className="p-3 bg-secondary rounded-md">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Note:</span> {document.reviewNote}
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
