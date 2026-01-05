import { describe, it, expect } from "vitest"
import { calculateProfileCompletion } from "../verification"
import type { DriverProfile, DriverDocument } from "@prisma/client"

describe("Profile Completion Calculation", () => {
  it("should calculate 0% for empty profile", () => {
    const profile = {
      id: "1",
      userId: "1",
      idNumber: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      province: null,
      postalCode: null,
      verificationStatus: "UNVERIFIED" as const,
      verificationNote: null,
      completionPercent: 0,
      lastLat: null,
      lastLng: null,
      lastAccuracy: null,
      lastLocationAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      documents: [],
      user: {
        isEmailVerified: false,
        name: null,
        phone: null,
      },
    }

    const percent = calculateProfileCompletion(profile)
    expect(percent).toBe(0)
  })

  it("should calculate 100% for complete profile", () => {
    const profile = {
      id: "1",
      userId: "1",
      idNumber: "1234567890123",
      addressLine1: "123 Main St",
      addressLine2: null,
      city: "Johannesburg",
      province: "Gauteng",
      postalCode: "2000",
      verificationStatus: "VERIFIED" as const,
      verificationNote: null,
      completionPercent: 100,
      lastLat: -26.2041,
      lastLng: 28.0473,
      lastAccuracy: 10,
      lastLocationAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      documents: [
        { type: "DRIVER_PHOTO" as const, id: "1", driverId: "1", fileUrl: "", status: "APPROVED" as const },
        { type: "CERTIFIED_ID" as const, id: "2", driverId: "1", fileUrl: "", status: "APPROVED" as const },
        { type: "PROOF_OF_RESIDENCE" as const, id: "3", driverId: "1", fileUrl: "", status: "APPROVED" as const },
      ],
      user: {
        isEmailVerified: true,
        name: "John Doe",
        phone: "+27123456789",
      },
    }

    const percent = calculateProfileCompletion(profile)
    expect(percent).toBe(100)
  })

  it("should calculate partial completion correctly", () => {
    const profile = {
      id: "1",
      userId: "1",
      idNumber: "1234567890123",
      addressLine1: null,
      addressLine2: null,
      city: null,
      province: null,
      postalCode: null,
      verificationStatus: "UNVERIFIED" as const,
      verificationNote: null,
      completionPercent: 0,
      lastLat: null,
      lastLng: null,
      lastAccuracy: null,
      lastLocationAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      documents: [],
      user: {
        isEmailVerified: true,
        name: "John Doe",
        phone: null,
      },
    }

    const percent = calculateProfileCompletion(profile)
    // Email verified (1) + name (1) = 2 out of 8 = 25%
    expect(percent).toBe(25)
  })
})

