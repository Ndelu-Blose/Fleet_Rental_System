const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/jpg",
  "image/png",
]

const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]
const ALLOWED_DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"]

export type FileValidationOptions = {
  maxSize?: number
  allowedTypes?: string[]
  allowedExtensions?: string[]
  isImage?: boolean
  isDocument?: boolean
}

export function validateFile(
  file: File,
  options: FileValidationOptions = {},
): { valid: boolean; error?: string } {
  const {
    maxSize = MAX_FILE_SIZE,
    allowedTypes,
    allowedExtensions,
    isImage = false,
    isDocument = false,
  } = options

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
    }
  }

  // Check file type based on options
  let typesToCheck: string[] = []
  let extensionsToCheck: string[] = []

  if (isImage) {
    typesToCheck = ALLOWED_IMAGE_TYPES
    extensionsToCheck = ALLOWED_IMAGE_EXTENSIONS
  } else if (isDocument) {
    typesToCheck = ALLOWED_DOCUMENT_TYPES
    extensionsToCheck = ALLOWED_DOCUMENT_EXTENSIONS
  } else if (allowedTypes) {
    typesToCheck = allowedTypes
  } else if (allowedExtensions) {
    extensionsToCheck = allowedExtensions
  }

  // Validate MIME type
  if (typesToCheck.length > 0 && !typesToCheck.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${typesToCheck.join(", ")}`,
    }
  }

  // Validate file extension
  if (extensionsToCheck.length > 0) {
    const fileName = file.name.toLowerCase()
    const hasValidExtension = extensionsToCheck.some((ext) => fileName.endsWith(ext.toLowerCase()))

    if (!hasValidExtension) {
      return {
        valid: false,
        error: `File extension not allowed. Allowed extensions: ${extensionsToCheck.join(", ")}`,
      }
    }
  }

  return { valid: true }
}

export function validateDriverDocument(file: File): { valid: boolean; error?: string } {
  return validateFile(file, {
    isDocument: true,
    maxSize: MAX_FILE_SIZE,
  })
}

export function validateVehicleDocument(file: File): { valid: boolean; error?: string } {
  return validateFile(file, {
    isDocument: true,
    maxSize: MAX_FILE_SIZE,
  })
}

