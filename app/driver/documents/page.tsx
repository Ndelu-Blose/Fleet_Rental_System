"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DocumentUploader } from "@/components/document-uploader"
import { Loader2, FileText, CheckCircle2, XCircle, Clock, Download, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { getDocumentUrl } from "@/lib/supabase/utils"

type Document = {
  id: string
  type: string
  fileName: string | null
  fileUrl: string
  status: string
  reviewNote: string | null
  createdAt: string
}

export default function DriverDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/driver/documents")
      const data = await res.json()
      if (res.ok) {
        setDocuments(data)
      } else {
        toast.error(data.error || "Failed to fetch documents")
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error)
      toast.error("Failed to fetch documents")
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentUpload = async (file: File, docType: string) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("docType", docType)

    try {
      const res = await fetch("/api/driver/documents", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        toast.success("Document uploaded successfully")
        await fetchDocuments()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to upload document")
        throw new Error("Upload failed")
      }
    } catch (error) {
      console.error("Upload error:", error)
      throw error
    }
  }

  const getDocumentLabel = (type: string) => {
    switch (type) {
      case "DRIVER_PHOTO":
        return "Driver Photo"
      case "CERTIFIED_ID":
        return "Certified ID"
      case "PROOF_OF_RESIDENCE":
        return "Proof of Residence"
      default:
        return type
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-700"
      case "REJECTED":
        return "bg-red-100 text-red-700"
      default:
        return "bg-yellow-100 text-yellow-700"
    }
  }

  const getExistingDoc = (type: string) => {
    return documents.find((d) => d.type === type)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground mt-1">Upload and manage your verification documents</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Driver Photo</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentUploader
              docType="DRIVER_PHOTO"
              label="Upload a clear photo of yourself"
              onUpload={(file) => handleDocumentUpload(file, "DRIVER_PHOTO")}
              existingDoc={getExistingDoc("DRIVER_PHOTO") ? {
                fileName: getExistingDoc("DRIVER_PHOTO")!.fileName || "driver-photo",
                status: getExistingDoc("DRIVER_PHOTO")!.status,
              } : undefined}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Certified ID</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentUploader
              docType="CERTIFIED_ID"
              label="Upload a certified copy of your ID"
              onUpload={(file) => handleDocumentUpload(file, "CERTIFIED_ID")}
              existingDoc={getExistingDoc("CERTIFIED_ID") ? {
                fileName: getExistingDoc("CERTIFIED_ID")!.fileName || "certified-id",
                status: getExistingDoc("CERTIFIED_ID")!.status,
              } : undefined}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proof of Residence</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentUploader
              docType="PROOF_OF_RESIDENCE"
              label="Upload proof of residence (utility bill, bank statement, etc.)"
              onUpload={(file) => handleDocumentUpload(file, "PROOF_OF_RESIDENCE")}
              existingDoc={getExistingDoc("PROOF_OF_RESIDENCE") ? {
                fileName: getExistingDoc("PROOF_OF_RESIDENCE")!.fileName || "proof-of-residence",
                status: getExistingDoc("PROOF_OF_RESIDENCE")!.status,
              } : undefined}
            />
          </CardContent>
        </Card>
      </div>

      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{getDocumentLabel(doc.type)}</p>
                      <p className="text-sm text-muted-foreground">{doc.fileName || "No filename"}</p>
                      {doc.reviewNote && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <AlertCircle className="h-3 w-3 inline mr-1" />
                          {doc.reviewNote}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getStatusColor(doc.status)}`}>
                      {getStatusIcon(doc.status)}
                      <span>{doc.status}</span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(getDocumentUrl(doc.fileUrl), "_blank")}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
