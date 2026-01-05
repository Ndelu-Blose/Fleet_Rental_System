import { describe, it, expect } from "vitest"
import { validateDriverDocument, validateVehicleDocument } from "../file-validation"

describe("File Validation", () => {
  describe("validateDriverDocument", () => {
    it("should accept valid PDF file", () => {
      const file = new File(["test content"], "test.pdf", { type: "application/pdf" })
      const result = validateDriverDocument(file)
      expect(result.valid).toBe(true)
    })

    it("should accept valid image file", () => {
      const file = new File(["test content"], "test.jpg", { type: "image/jpeg" })
      const result = validateDriverDocument(file)
      expect(result.valid).toBe(true)
    })

    it("should reject file that is too large", () => {
      // Create a file larger than 10MB
      const largeContent = "x".repeat(11 * 1024 * 1024) // 11MB
      const file = new File([largeContent], "large.pdf", { type: "application/pdf" })
      const result = validateDriverDocument(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain("exceeds maximum")
    })

    it("should reject invalid file type", () => {
      const file = new File(["test"], "test.exe", { type: "application/x-msdownload" })
      const result = validateDriverDocument(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain("not allowed")
    })
  })

  describe("validateVehicleDocument", () => {
    it("should accept valid PDF file", () => {
      const file = new File(["test content"], "test.pdf", { type: "application/pdf" })
      const result = validateVehicleDocument(file)
      expect(result.valid).toBe(true)
    })

    it("should reject file that is too large", () => {
      const largeContent = "x".repeat(11 * 1024 * 1024) // 11MB
      const file = new File([largeContent], "large.pdf", { type: "application/pdf" })
      const result = validateVehicleDocument(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain("exceeds maximum")
    })
  })
})

