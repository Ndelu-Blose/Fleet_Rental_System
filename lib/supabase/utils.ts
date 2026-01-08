/**
 * Supabase Storage URL Utilities
 * Works in both client and server contexts
 */

// Ensure Supabase URL has protocol
function ensureProtocol(url: string): string {
  if (!url) return url
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }
  return `https://${url}`
}

// Get Supabase URL - works in both client and server contexts
function getSupabaseUrl(): string {
  // Use NEXT_PUBLIC_ env vars which are available in both contexts
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  if (!url) {
    console.error("[Supabase] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL not set")
    return "https://rlgcnqzrpkkbughwehhm.supabase.co" // Fallback for development
  }
  return ensureProtocol(url)
}

// Get bucket names
function getBucketDriver(): string {
  return process.env.SUPABASE_BUCKET_DRIVER || "driver-kyc"
}

function getBucketVehicle(): string {
  return process.env.SUPABASE_BUCKET_VEHICLE || "vehicle-docs"
}

/**
 * Extract bucket and path from a Supabase storage URL
 * Handles both full URLs and paths
 */
export function parseSupabasePath(fileUrlOrPath: string): { bucket: string; path: string } | null {
  if (!fileUrlOrPath) return null

  // If it's already a path (no http), use it directly
  if (!fileUrlOrPath.startsWith("http")) {
    // Assume driver-kyc bucket if no bucket specified
    return {
      bucket: getBucketDriver(),
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
 * Constructs URL directly - simpler and more reliable than SDK
 */
export function getPublicUrl(bucket: string, path: string): string {
  const baseUrl = getSupabaseUrl()
  // Encode each path segment separately, then join with /
  const encodedPath = path.split("/").map(segment => encodeURIComponent(segment)).join("/")
  const url = `${baseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`
  
  // Double-check protocol is present
  return ensureProtocol(url)
}

/**
 * Get public URL from fileUrl (handles both old full URLs and new paths)
 * @param fileUrl - The fileUrl from database (can be full URL or path)
 * @param bucket - Optional bucket name (defaults to driver-kyc)
 */
export function getDocumentUrl(fileUrl: string, bucket?: string): string {
  if (!fileUrl) {
    console.error("[Supabase] getDocumentUrl called with empty fileUrl")
    return ""
  }

  const parsed = parseSupabasePath(fileUrl)
  
  if (parsed) {
    return getPublicUrl(parsed.bucket, parsed.path)
  }

  // Fallback: if we can't parse it, assume it's a path and use provided/default bucket
  const targetBucket = bucket || getBucketDriver()
  return getPublicUrl(targetBucket, fileUrl)
}

/**
 * Get public URL for vehicle documents
 */
export function getVehicleDocumentUrl(fileUrl: string): string {
  return getDocumentUrl(fileUrl, getBucketVehicle())
}
