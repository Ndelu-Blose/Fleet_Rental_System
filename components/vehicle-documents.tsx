"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileText, Upload, Loader2, Calendar } from "lucide-react"

interface VehicleDocument {
  id: string
  type: string
  title: string | null
  fileName: string | null
  fileUrl: string
  issuedAt: string | null
  expiresAt: string | null
  createdAt: string
}

interface VehicleDocumentsProps {
  vehicleId: string
  documents: VehicleDocument[]
  onRefresh: () => void
}

export function VehicleDocuments({ vehicleId, documents, onRefresh }: VehicleDocumentsProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    type: "OTHER",
    title: "",
    issuedAt: "",
    expiresAt: "",
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    try {
      const formDataToSend = new FormData()
      formDataToSend.append("file", file)
      formDataToSend.append("type", formData.type)
      formDataToSend.append("title", formData.title)
      if (formData.issuedAt) formDataToSend.append("issuedAt", formData.issuedAt)
      if (formData.expiresAt) formDataToSend.append("expiresAt", formData.expiresAt)

      const res = await fetch(`/api/admin/vehicles/${vehicleId}/documents`, {
        method: "POST",
        body: formDataToSend,
      })

      if (res.ok) {
        setShowDialog(false)
        setFile(null)
        setFormData({ type: "OTHER", title: "", issuedAt: "", expiresAt: "" })
        onRefresh()
      }
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      setUploading(false)
    }
  }

  const isExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false
    const daysUntilExpiry = Math.floor((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Vehicle Documents</h3>
        <Button onClick={() => setShowDialog(true)} size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </div>

      <div className="grid gap-4">
        {documents.map((doc) => (
          <Card key={doc.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h4 className="font-medium">{doc.title || doc.type.replace(/_/g, " ")}</h4>
                  <p className="text-sm text-muted-foreground">{doc.fileName}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {doc.issuedAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Issued: {new Date(doc.issuedAt).toLocaleDateString()}
                      </div>
                    )}
                    {doc.expiresAt && (
                      <div
                        className={`flex items-center gap-1 ${
                          isExpired(doc.expiresAt)
                            ? "text-red-600 font-medium"
                            : isExpiringSoon(doc.expiresAt)
                              ? "text-yellow-600 font-medium"
                              : ""
                        }`}
                      >
                        <Calendar className="h-3 w-3" />
                        Expires: {new Date(doc.expiresAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  View
                </Button>
              </a>
            </div>
          </Card>
        ))}

        {documents.length === 0 && (
          <Card className="p-8">
            <p className="text-center text-sm text-muted-foreground">No documents uploaded yet</p>
          </Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Vehicle Document</DialogTitle>
            <DialogDescription>Add a new document to the vehicle record</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="docType">Document Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNERSHIP">Ownership Documents</SelectItem>
                  <SelectItem value="LICENSE">Vehicle License</SelectItem>
                  <SelectItem value="ROADWORTHY">Roadworthy Certificate</SelectItem>
                  <SelectItem value="INSURANCE">Insurance Policy</SelectItem>
                  <SelectItem value="SERVICE_HISTORY">Service History</SelectItem>
                  <SelectItem value="INVOICE">Invoice/Receipt</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Document description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issuedAt">Issued Date</Label>
                <Input
                  id="issuedAt"
                  type="date"
                  value={formData.issuedAt}
                  onChange={(e) => setFormData({ ...formData, issuedAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expiry Date</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">File *</Label>
              <Input id="file" type="file" onChange={handleFileChange} required />
            </div>

            <Button type="submit" disabled={uploading || !file} className="w-full">
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload Document"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
