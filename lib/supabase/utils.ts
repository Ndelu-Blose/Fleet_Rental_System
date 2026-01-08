import { env } from "@/lib/env"

/**
 * Extract bucket and path from a Supabase storage URL
 * Handles both full URLs and paths
 */
export function parseSupabasePath(fileUrlOrPath: string): { bucket: string; path: string } | null {
  // If it's already a path (no http), use it directly
  if (!fileUrlOrPath.startsWith("http")) {
    // Assume driver-kyc bucket if no bucket specified
    return {
      bucket: env.supabase.bucketDriver,
      path: fileUrlOrPath,
    }
  }

  // Parse full URL: https://...supabase.co/storage/v1/object/public/{bucket}/{path}
  const urlPattern = /\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/
  const match = fileUrlOrPath.match(urlPattern)

  if (match) {
    return {
      bucket: match[1],
      path: decodeURIComponent(match[2]), // Decode URL-encoded paths
    }
  }

  return null
}

/**
 * Generate a public URL from bucket and path
 * This constructs the URL directly without needing a Supabase client
 */
export function getPublicUrl(bucket: string, path: string): string {
  const baseUrl = env.supabase.url
  // Encode path components properly
  const encodedPath = path.split("/").map(encodeURIComponent).join("/")
  return `${baseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`
}

/**
 * Get public URL from fileUrl (handles both old full URLs and new paths)
 * @param fileUrl - The fileUrl from database (can be full URL or path)
 * @param bucket - Optional bucket name (defaults to driver-kyc)
 */
export function getDocumentUrl(fileUrl: string, bucket?: string): string {
  const parsed = parseSupabasePath(fileUrl)
  
  if (parsed) {
    return getPublicUrl(parsed.bucket, parsed.path)
  }

  // Fallback: if we can't parse it, try with provided bucket or default
  const targetBucket = bucket || env.supabase.bucketDriver
  return getPublicUrl(targetBucket, fileUrl)
}

/**
 * Get public URL for vehicle documents
 */
export function getVehicleDocumentUrl(fileUrl: string): string {
  return getDocumentUrl(fileUrl, env.supabase.bucketVehicle)
}
