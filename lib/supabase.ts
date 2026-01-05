import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"

export const supabase = createClient(env.supabase.url, env.supabase.serviceRoleKey)

export async function uploadDriverDocument(file: File, driverProfileId: string, docType: string): Promise<string> {
  const fileName = `${driverProfileId}/${docType}-${Date.now()}-${file.name}`

  const { data, error } = await supabase.storage.from(env.supabase.bucketDriver).upload(fileName, file)

  if (error) throw error

  const { data: urlData } = supabase.storage.from(env.supabase.bucketDriver).getPublicUrl(data.path)

  return urlData.publicUrl
}

export async function uploadVehicleDocument(file: File, vehicleId: string, docType: string): Promise<string> {
  const fileName = `${vehicleId}/${docType}-${Date.now()}-${file.name}`

  const { data, error } = await supabase.storage.from(env.supabase.bucketVehicle).upload(fileName, file)

  if (error) throw error

  const { data: urlData } = supabase.storage.from(env.supabase.bucketVehicle).getPublicUrl(data.path)

  return urlData.publicUrl
}
