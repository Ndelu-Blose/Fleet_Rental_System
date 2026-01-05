// Re-export from server.ts for backward compatibility
// Use lib/supabase/server.ts for server-side operations
// Use lib/supabase/client.ts for client-side operations
export { supabaseAdmin as supabase, uploadDriverDocument, uploadVehicleDocument } from "./supabase/server"
