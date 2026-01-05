import { prisma } from "@/lib/prisma"
import type { DriverProfile, DriverDocument } from "@prisma/client"

type ProfileWithDocuments = DriverProfile & {
  documents: DriverDocument[]
  user: {
    isEmailVerified: boolean
    name: string | null
    phone: string | null
  }
}

export function calculateProfileCompletion(profile: ProfileWithDocuments): number {
  let completed = 0
  const total = 8

  // Email verified
  if (profile.user.isEmailVerified) completed++

  // Basic info
  if (profile.user.name) completed++
  if (profile.user.phone) completed++

  // ID number
  if (profile.idNumber) completed++

  // Address
  if (profile.addressLine1 && profile.city && profile.province) completed++

  // Location verified
  if (profile.lastLocationAt) completed++

  // Documents
  const hasPhoto = profile.documents.some((d) => d.type === "DRIVER_PHOTO")
  const hasCertifiedId = profile.documents.some((d) => d.type === "CERTIFIED_ID")
  const hasProofOfResidence = profile.documents.some((d) => d.type === "PROOF_OF_RESIDENCE")

  if (hasPhoto) completed++
  if (hasCertifiedId && hasProofOfResidence) completed++

  return Math.round((completed / total) * 100)
}

export async function updateProfileCompletion(driverProfileId: string) {
  const profile = await prisma.driverProfile.findUnique({
    where: { id: driverProfileId },
    include: {
      documents: true,
      user: {
        select: {
          isEmailVerified: true,
          name: true,
          phone: true,
        },
      },
    },
  })

  if (!profile) return

  const percent = calculateProfileCompletion(profile)

  await prisma.driverProfile.update({
    where: { id: driverProfileId },
    data: { completionPercent: percent },
  })

  return percent
}
