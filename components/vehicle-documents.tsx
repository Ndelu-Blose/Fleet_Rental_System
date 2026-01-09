"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { FileText, Upload, Loader2, Calendar, AlertCircle } from "lucide-react"
import { parseSupabasePath } from "@/lib/supabase/utils"
import { env } from "@/lib/env"

// Document type configuration
type DocumentTypeConfig = {
  label: string
  defaultTitle: string
  expiryRequired: boolean
  helperText: string
  priority: "required" | "recommended" | "optional"
  allowMultiple: boolean // Whether this document type can be uploaded multiple times
}

// Single-document types (one per vehicle)
const SINGLE_DOCUMENT_TYPES = ["LICENSE", "ROADWORTHY", "INSURANCE", "OWNERSHIP"]

// Multi-document types (can upload multiple)
const MULTI_DOCUMENT_TYPES = ["SERVICE_HISTORY", "INVOICE", "OTHER"]

const DOCUMENT_TYPE_CONFIG: Record<string, DocumentTypeConfig> = {
  LICENSE: {
    label: "Vehicle License",
    defaultTitle: "Vehicle License Disc",
    expiryRequired: true,
    helperText: "Required by law. Renew annually.",
    priority: "required",
    allowMultiple: false,
  },
  ROADWORTHY: {
    label: "Roadworthy Certificate",
    defaultTitle: "Roadworthy Certificate",
    expiryRequired: true,
    helperText: "Vehicle cannot be rented without this.",
    priority: "required",
    allowMultiple: false,
  },
  INSURANCE: {
    label: "Insurance Policy",
    defaultTitle: "Insurance Policy",
    expiryRequired: true,
    helperText: "Upload current insurance cover.",
    priority: "required",
    allowMultiple: false,
  },
  OWNERSHIP: {
    label: "Ownership Documents",
    defaultTitle: "Registration Certificate (RC1)",
    expiryRequired: false,
    helperText: "Proof of ownership.",
    priority: "required",
    allowMultiple: false,
  },
  SERVICE_HISTORY: {
    label: "Service History",
    defaultTitle: "Service Record",
    expiryRequired: false,
    helperText: "Optional but recommended.",
    priority: "recommended",
    allowMultiple: true,
  },
  INVOICE: {
    label: "Invoice/Receipt",
    defaultTitle: "Purchase Invoice",
    expiryRequired: false,
    helperText: "Keep for accounting & audits.",
    priority: "optional",
    allowMultiple: true,
  },
  OTHER: {
    label: "Other",
    defaultTitle: "",
    expiryRequired: false,
    helperText: "Add a short description.",
    priority: "optional",
    allowMultiple: true,
  },
}

interface VehicleDocument {
  id: string
  type: string
  title: string | null
  fileName: string | null
  fileUrl: string
  bucket?: string | null
  path?: string | null
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [formData, setFormData] = useState({
    type: "OTHER",
    title: "",
    issuedAt: "",
    expiresAt: "",
  })
  const [errors, setErrors] = useState<{
    file?: string
    expiry?: string
    dates?: string
  }>({})

  // Get current document type config
  const currentConfig = DOCUMENT_TYPE_CONFIG[formData.type] || DOCUMENT_TYPE_CONFIG.OTHER

  // Get existing document types
  const existingDocumentTypes = new Set(documents.map((doc) => doc.type))

  // Get available document types for dropdown (filter out single-document types that already exist)
  const getAvailableDocumentTypes = () => {
    return Object.entries(DOCUMENT_TYPE_CONFIG).filter(([type, config]) => {
      // If it's a multi-document type, always show it
      if (config.allowMultiple) return true
      // If it's a single-document type, only show if it doesn't exist yet
      return !existingDocumentTypes.has(type)
    })
  }

  const availableTypes = getAvailableDocumentTypes()

  // Get document status summary
  const getDocumentStatus = (type: string) => {
    const doc = documents.find((d) => d.type === type)
    if (!doc) return { status: "missing", label: "Missing" }
    if (doc.expiresAt) {
      if (isExpired(doc.expiresAt)) return { status: "expired", label: "Expired" }
      if (isExpiringSoon(doc.expiresAt)) return { status: "expiring", label: "Expires soon" }
    }
    return { status: "valid", label: "Uploaded" }
  }

  // Auto-fill title when document type changes
  useEffect(() => {
    if (formData.type && currentConfig.defaultTitle) {
      setFormData((prev) => ({
        ...prev,
        title: currentConfig.defaultTitle,
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.type])

  // Reset form when dialog closes
  const handleDialogChange = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      if (confirm("Discard this document? Any entered information will be lost.")) {
        resetForm()
        setShowDialog(false)
      } else {
        // Keep dialog open if user cancels
        setShowDialog(true)
      }
    } else {
      setShowDialog(open)
      if (!open) {
        resetForm()
      }
    }
  }

  const resetForm = () => {
    setFile(null)
    // Set default type to first available type, or OTHER if none available
    const defaultType = availableTypes.length > 0 ? availableTypes[0][0] : "OTHER"
    setFormData({ type: defaultType, title: "", issuedAt: "", expiresAt: "" })
    setHasUnsavedChanges(false)
    setErrors({})
  }

  // Reset form type if current selection becomes unavailable
  useEffect(() => {
    if (showDialog && !availableTypes.find(([type]) => type === formData.type)) {
      const defaultType = availableTypes.length > 0 ? availableTypes[0][0] : "OTHER"
      setFormData((prev) => ({ ...prev, type: defaultType }))
    }
  }, [showDialog, documents])

  const handleViewDocument = async (doc: VehicleDocument) => {
    try {
      const bucket = doc.bucket || (() => {
        const parsed = parseSupabasePath(doc.fileUrl)
        return parsed?.bucket || "vehicle-docs"
      })()
      const path = doc.path || (() => {
        const parsed = parseSupabasePath(doc.fileUrl)
        return parsed?.path || doc.fileUrl
      })()
      
      const res = await fetch("/api/files/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket, path, expiresIn: 300 }),
      })
      const data = await res.json()
      
      if (!data.ok || !data.url) {
        throw new Error(data.error || "Failed to get signed URL")
      }
      
      window.open(data.url, "_blank", "noopener,noreferrer")
    } catch (error: any) {
      console.error("Failed to open document:", error)
      alert(error.message || "Failed to open document")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
      const maxSize = 5 * 1024 * 1024 // 5MB

      if (!allowedTypes.includes(selectedFile.type)) {
        setErrors((prev) => ({
          ...prev,
          file: "Only PDF, JPG, and PNG files are allowed.",
        }))
        return
      }

      if (selectedFile.size > maxSize) {
        setErrors((prev) => ({
          ...prev,
          file: "File size must be less than 5MB.",
        }))
        return
      }

      setFile(selectedFile)
      setErrors((prev) => ({ ...prev, file: undefined }))
      setHasUnsavedChanges(true)
    }
  }

  // Validate dates
  const validateDates = () => {
    const newErrors: typeof errors = {}

    if (formData.issuedAt && formData.expiresAt) {
      const issued = new Date(formData.issuedAt)
      const expires = new Date(formData.expiresAt)

      if (expires < issued) {
        newErrors.dates = "Expiry date must be after issue date."
      }

      if (expires < new Date()) {
        newErrors.expiry = "⚠️ This document is already expired."
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form data changes
  const handleFormDataChange = (updates: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
    setHasUnsavedChanges(true)
  }

  // Validate on date changes
  useEffect(() => {
    if (formData.issuedAt || formData.expiresAt) {
      validateDates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.issuedAt, formData.expiresAt])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    // Final validation
    if (!validateDates()) {
      return
    }

    // Check if expiry is required but missing
    if (currentConfig.expiryRequired && !formData.expiresAt) {
      setErrors((prev) => ({
        ...prev,
        expiry: "Expiry date is required for this document type.",
      }))
      return
    }

    setUploading(true)
    try {
      const formDataToSend = new FormData()
      formDataToSend.append("file", file)
      formDataToSend.append("type", formData.type)
      formDataToSend.append("title", formData.title || currentConfig.defaultTitle)
      if (formData.issuedAt) formDataToSend.append("issuedAt", formData.issuedAt)
      if (formData.expiresAt) formDataToSend.append("expiresAt", formData.expiresAt)

      const res = await fetch(`/api/admin/vehicles/${vehicleId}/documents`, {
        method: "POST",
        body: formDataToSend,
      })

      if (res.ok) {
        setShowDialog(false)
        resetForm()
        onRefresh()
      } else {
        const data = await res.json()
        alert(data.error || "Upload failed. Please try again.")
      }
    } catch (error) {
      console.error("Upload failed:", error)
      alert("Upload failed. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  // Check if form is valid
  const isFormValid = () => {
    if (!file) return false
    if (Object.keys(errors).length > 0) return false
    if (currentConfig.expiryRequired && !formData.expiresAt) return false
    return true
  }

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "required":
        return (
          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 font-normal">
            Required by law
          </Badge>
        )
      case "recommended":
        return (
          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 font-normal">
            Recommended
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-xs font-normal">
            Optional
          </Badge>
        )
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
              <Button variant="outline" size="sm" onClick={() => handleViewDocument(doc)}>
                View
              </Button>
            </div>
          </Card>
        ))}

        {documents.length === 0 && (
          <Card className="p-8">
            <p className="text-center text-sm text-muted-foreground">No documents uploaded yet</p>
          </Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Vehicle Document</DialogTitle>
            <DialogDescription>Add a new document to the vehicle record</DialogDescription>
          </DialogHeader>

          {/* Document Status Summary */}
          {SINGLE_DOCUMENT_TYPES.length > 0 && (
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium">Required documents</h4>
              <div className="space-y-2">
                {SINGLE_DOCUMENT_TYPES.map((type) => {
                  const status = getDocumentStatus(type)
                  const config = DOCUMENT_TYPE_CONFIG[type]
                  const isMissing = status.status === "missing"
                  const isExpired = status.status === "expired"
                  const isExpiring = status.status === "expiring"
                  
                  return (
                    <div key={type} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <span className={`text-sm ${isMissing ? "text-muted-foreground" : "font-medium"}`}>
                        {config.label}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          status.status === "valid"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : isExpired
                              ? "bg-red-50 text-red-700 border-red-200"
                              : isExpiring
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {status.label}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {availableTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">All single-document types have been uploaded.</p>
              <p className="text-xs mt-2">You can still upload multiple Service History, Invoice, or Other documents.</p>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-5">
              {/* Document Type with Priority Badge */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="docType">Document Type *</Label>
                  {getPriorityBadge(currentConfig.priority)}
                </div>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleFormDataChange({ type: value, expiresAt: "" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTypes.map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">{currentConfig.helperText}</p>
              </div>

            {/* Document Name */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Document name
                {currentConfig.defaultTitle && (
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    Example: "{currentConfig.defaultTitle}"
                  </span>
                )}
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleFormDataChange({ title: e.target.value })}
                placeholder={currentConfig.defaultTitle || "Enter document name"}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issuedAt">
                  Issue date
                  <span className="text-xs font-normal text-muted-foreground block mt-0.5">
                    Date this document was issued
                  </span>
                </Label>
                <Input
                  id="issuedAt"
                  type="date"
                  value={formData.issuedAt}
                  onChange={(e) => handleFormDataChange({ issuedAt: e.target.value })}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">
                  Expiry date
                  {currentConfig.expiryRequired && (
                    <span className="text-xs font-medium text-red-600 ml-1">*</span>
                  )}
                  <span className="text-xs font-normal text-muted-foreground block mt-0.5">
                    When this document expires {currentConfig.expiryRequired ? "(required)" : "(if applicable)"}
                  </span>
                </Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => handleFormDataChange({ expiresAt: e.target.value })}
                  disabled={!currentConfig.expiryRequired && formData.type !== "OTHER"}
                  required={currentConfig.expiryRequired}
                  min={formData.issuedAt || undefined}
                />
                {errors.expiry && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.expiry}
                  </p>
                )}
                {errors.dates && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.dates}
                  </p>
                )}
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file">
                File *
                <span className="text-xs font-normal text-muted-foreground block mt-0.5">
                  PDF, JPG, or PNG (max 5MB)
                </span>
              </Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
                required
                className="cursor-pointer"
              />
              {file && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm flex-1">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              )}
              {errors.file && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.file}
                </p>
              )}
            </div>

              {/* Submit Button */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogChange(false)}
                  disabled={uploading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading || !isFormValid()} className="flex-1">
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload & Save
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
