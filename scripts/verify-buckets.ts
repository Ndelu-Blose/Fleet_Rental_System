#!/usr/bin/env tsx
/**
 * Script to verify Supabase storage buckets exist
 * Run: pnpm tsx scripts/verify-buckets.ts
 */

import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
import { resolve } from "path"

// Load .env files (tries .env.local first, then .env)
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env")
  console.error("Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const requiredBuckets = [
  process.env.SUPABASE_BUCKET_DRIVER || "driver-kyc",
  process.env.SUPABASE_BUCKET_VEHICLE || "vehicle-docs",
]

async function verifyBuckets() {
  console.log("🔍 Checking Supabase storage buckets...\n")

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
      console.error("❌ Error fetching buckets:", error.message)
      process.exit(1)
    }

    const bucketNames = buckets?.map((b) => b.name) || []
    const missingBuckets: string[] = []
    const existingBuckets: string[] = []

    for (const bucketName of requiredBuckets) {
      if (bucketNames.includes(bucketName)) {
        existingBuckets.push(bucketName)
        const bucket = buckets?.find((b) => b.name === bucketName)
        console.log(`✅ ${bucketName} - exists (${bucket?.public ? "Public" : "Private"})`)
      } else {
        missingBuckets.push(bucketName)
        console.log(`❌ ${bucketName} - NOT FOUND`)
      }
    }

    console.log("\n" + "=".repeat(50))

    if (missingBuckets.length === 0) {
      console.log("✅ All required buckets exist!")
      return true
    } else {
      console.log(`❌ Missing ${missingBuckets.length} bucket(s):`)
      missingBuckets.forEach((name) => console.log(`   - ${name}`))
      console.log("\n📝 To create buckets:")
      console.log("   1. Go to Supabase Dashboard → Storage")
      console.log("   2. Click 'New bucket'")
      console.log("   3. Create each missing bucket")
      console.log("   4. Set to Public (or Private with RLS policies)")
      return false
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error)
    process.exit(1)
  }
}

verifyBuckets()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error("❌ Script failed:", error)
    process.exit(1)
  })


