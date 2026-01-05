# Supabase Setup Guide

## Quick Setup Steps

### 1. Get Your Supabase Credentials

Go to your Supabase Dashboard → **Settings → API**:

- **Project URL**: `https://rlgcnqzrpkkbughwehhm.supabase.co`
- **anon key**: Safe for frontend (public)
- **service_role key**: Server-only (keep secret!)

### 2. Get Database Connection String

Go to **Settings → Database**:

- Use the **Connection pooling** URI (recommended for serverless)
- Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
- Or use direct connection: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

### 3. Create Storage Buckets

Go to **Storage** in Supabase Dashboard:

1. Create bucket: `driver-kyc`
   - Set to **Public** (or Private with RLS policies)
   
2. Create bucket: `vehicle-docs`
   - Set to **Public** (or Private with RLS policies)

### 4. Update `.env` File

Create `.env` file in project root (copy from `.env.example`):

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres.rlgcnqzrpkkbughwehhm:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://rlgcnqzrpkkbughwehhm.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_BUCKET_DRIVER="driver-kyc"
SUPABASE_BUCKET_VEHICLE="vehicle-docs"

# Other required vars...
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
RESEND_API_KEY="..."
# etc.
```

### 5. Run Prisma Migrations

```bash
# Generate Prisma Client
pnpm prisma generate

# Push schema to Supabase (creates all tables)
pnpm prisma db push

# OR create a migration (better for production)
pnpm prisma migrate dev --name init_fleet_rental
```

### 6. Seed Initial Admin User

```bash
pnpm seed
```

This creates the first admin user. Default credentials:
- Email: `admin@fleet.com` (or from `ADMIN_EMAIL` env var)
- Password: `changeme123` (or from `ADMIN_PASSWORD` env var)

**⚠️ Change the password immediately after first login!**

### 7. Test Database Connection

Visit: `http://localhost:3000/api/health/db`

Should return:
```json
{
  "ok": true,
  "database": "connected",
  "users": 1,
  "timestamp": "..."
}
```

## Verify Tables Created

Go to Supabase Dashboard → **Table Editor**

You should see:
- ✅ `User`
- ✅ `DriverProfile`
- ✅ `DriverDocument`
- ✅ `Vehicle`
- ✅ `VehicleCompliance`
- ✅ `VehicleDocument`
- ✅ `VehicleMaintenance`
- ✅ `VehicleCost`
- ✅ `RentalContract`
- ✅ `Payment`

## Supabase Client Usage

### Client-Side (React Components)
```ts
import { supabase } from "@/lib/supabase/client"

// Use for client-side operations (respects RLS)
const { data } = await supabase.storage.from("driver-kyc").list()
```

### Server-Side (API Routes)
```ts
import { supabaseAdmin, uploadDriverDocument } from "@/lib/supabase/server"

// Use for server-side operations (bypasses RLS)
await uploadDriverDocument(file, driverId, "CERTIFIED_ID")
```

## Troubleshooting

### Connection Issues
- Check `DATABASE_URL` format (use pooler URL for serverless)
- Verify password is correct
- Check if IP is whitelisted (if using direct connection)

### Storage Issues
- Verify buckets exist: `driver-kyc` and `vehicle-docs`
- Check bucket policies (public vs private)
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct

### Migration Issues
- Ensure Prisma schema matches your needs
- Check for existing tables (may need to drop first)
- Use `pnpm prisma migrate reset` to start fresh (⚠️ deletes all data)

## Next Steps

After setup:
1. ✅ Test database connection
2. ✅ Create admin user via seed
3. ✅ Test file uploads
4. ✅ Set up RLS policies (optional, for extra security)
5. ✅ Configure cron jobs for payment generation



