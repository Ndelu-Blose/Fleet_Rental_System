import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"

// Server-side Supabase client (uses service role key, bypasses RLS)
export const supabaseAdmin = createClient(
  env.supabase.url,
  env.supabase.serviceRoleKey,
)

// Re-export upload functions for backward compatibility
// Returns the path (not full URL) - URLs should be generated at runtime
export async function uploadDriverDocument(file: File, driverProfileId: string, docType: string): Promise<string> {
  const fileName = `${driverProfileId}/${docType}-${Date.now()}-${file.name}`

  const { data, error } = await supabaseAdmin.storage.from(env.supabase.bucketDriver).upload(fileName, file)

  if (error) throw error

  // Return path only, not full URL
  // Components will generate URLs at runtime using getDocumentUrl()
  return data.path
}

export async function uploadVehicleDocument(file: File, vehicleId: string, docType: string): Promise<string> {
  const fileName = `${vehicleId}/${docType}-${Date.now()}-${file.name}`

  const { data, error } = await supabaseAdmin.storage.from(env.supabase.bucketVehicle).upload(fileName, file)

  if (error) throw error

  // Return path only, not full URL
  // Components will generate URLs at runtime using getDocumentUrl()
  return data.path
}



