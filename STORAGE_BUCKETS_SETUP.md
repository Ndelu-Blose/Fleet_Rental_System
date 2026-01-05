# Supabase Storage Buckets Setup Guide

## Step 2: Create Storage Buckets

You need to create two storage buckets in Supabase for file uploads:

1. **`driver-kyc`** - For driver verification documents (ID, photos, proof of residence)
2. **`vehicle-docs`** - For vehicle documents (ownership, insurance, roadworthy certificates)

---

## How to Create Buckets

### Option 1: Via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project: **Fleet rental** (ID: `rlgcnqzrpkkbughwehhm`)

2. **Open Storage**
   - Click **Storage** in the left sidebar
   - You'll see the storage buckets page

3. **Create First Bucket: `driver-kyc`**
   - Click **"New bucket"** button
   - **Name**: `driver-kyc`
   - **Public bucket**: ✅ **Enable** (or Private with RLS policies)
   - **File size limit**: Leave default or set to 10MB
   - **Allowed MIME types**: Leave empty (allows all types)
   - Click **"Create bucket"**

4. **Create Second Bucket: `vehicle-docs`**
   - Click **"New bucket"** button again
   - **Name**: `vehicle-docs`
   - **Public bucket**: ✅ **Enable** (or Private with RLS policies)
   - **File size limit**: Leave default or set to 10MB
   - **Allowed MIME types**: Leave empty (allows all types)
   - Click **"Create bucket"**

### Option 2: Via Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref rlgcnqzrpkkbughwehhm

# Create buckets
supabase storage create driver-kyc --public
supabase storage create vehicle-docs --public
```

---

## Bucket Configuration

### Public vs Private

**Public Buckets** (Recommended for simplicity):
- ✅ Files are accessible via public URLs
- ✅ No authentication required to view files
- ⚠️ Anyone with the URL can access files
- ✅ Simpler setup, works immediately

**Private Buckets** (More secure):
- ✅ Files require authentication to access
- ✅ Better security, prevents unauthorized access
- ⚠️ Requires RLS (Row Level Security) policies
- ⚠️ More complex setup

### Recommended: Start with Public

For development and initial setup, use **Public buckets**. You can switch to Private later with RLS policies.

---

## Verify Buckets Created

After creating buckets, verify they exist:

### Method 1: Check in Dashboard
- Go to **Storage** in Supabase Dashboard
- You should see both `driver-kyc` and `vehicle-docs` listed

### Method 2: Run Verification Script

```bash
# Make sure your .env file has Supabase credentials filled in
pnpm tsx scripts/verify-buckets.ts
```

This will check if both buckets exist and show their status.

---

## Bucket Policies (Optional - for Private Buckets)

If you choose **Private buckets**, you'll need to set up RLS policies:

### For `driver-kyc` bucket:

```sql
-- Allow authenticated users to upload their own documents
CREATE POLICY "Users can upload their own driver documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'driver-kyc' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own documents
CREATE POLICY "Users can read their own driver documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'driver-kyc' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### For `vehicle-docs` bucket:

```sql
-- Allow admins to upload vehicle documents
CREATE POLICY "Admins can upload vehicle documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-docs' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Allow authenticated users to read vehicle documents
CREATE POLICY "Authenticated users can read vehicle documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'vehicle-docs');
```

**Note**: These policies assume you're using Supabase Auth. Since this project uses NextAuth, you may need to adjust policies or use service role key for all operations (current setup).

---

## Current Setup

The project is configured to use:
- **Service Role Key** for all storage operations (bypasses RLS)
- This means buckets can be Private or Public - both will work
- Files are uploaded via server-side API routes using `supabaseAdmin`

---

## Troubleshooting

### Bucket not found error
- ✅ Verify bucket name matches exactly: `driver-kyc` and `vehicle-docs`
- ✅ Check bucket exists in Supabase Dashboard → Storage
- ✅ Verify `SUPABASE_SERVICE_ROLE_KEY` is correct in `.env`

### Permission denied error
- ✅ If using Private buckets, ensure service role key has access
- ✅ Check bucket policies allow service role operations
- ✅ Try switching to Public bucket for testing

### File upload fails
- ✅ Check file size (should be ≤ 10MB based on validation)
- ✅ Verify file type is allowed (PDF, images)
- ✅ Check Supabase service role key is valid

---

## Next Steps

After buckets are created:

1. ✅ Verify buckets exist (run verification script)
2. ✅ Proceed to Step 3: Run Prisma migrations
3. ✅ Test file upload functionality

---

## Quick Checklist

- [ ] Created `driver-kyc` bucket in Supabase Dashboard
- [ ] Created `vehicle-docs` bucket in Supabase Dashboard
- [ ] Set buckets to Public (or configured Private with policies)
- [ ] Verified buckets exist (check Dashboard or run script)
- [ ] Ready for Step 3: Database migrations



