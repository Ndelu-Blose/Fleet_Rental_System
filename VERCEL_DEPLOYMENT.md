# Vercel Deployment Guide

This guide will help you deploy the FleetHub application to Vercel.

## Prerequisites

1. A Vercel account ([sign up here](https://vercel.com/signup))
2. A PostgreSQL database (recommended: Supabase)
3. Supabase account for file storage
4. Stripe account for payments
5. Resend account for emails
6. GitHub/GitLab/Bitbucket repository (optional, for automatic deployments)

## Step 1: Prepare Your Repository

1. **Push your code to a Git repository** (GitHub, GitLab, or Bitbucket)
2. **Ensure all migrations are committed** to your repository
3. **Verify your build works locally**:
   ```bash
   pnpm install
   pnpm prisma generate
   pnpm build
   ```

## Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your Git repository
4. Vercel will auto-detect Next.js configuration

## Step 3: Configure Environment Variables

In your Vercel project settings, add the following environment variables:

### Required Environment Variables

#### Database
- `DATABASE_URL` - Your PostgreSQL connection string
  - **Important**: Use the **connection pooling URL** for Supabase (recommended for serverless)
  - Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

#### Authentication
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `NEXTAUTH_URL` - Your production URL (e.g., `https://your-app.vercel.app`)

#### Email (Resend)
- `RESEND_API_KEY` - Your Resend API key
- `MAIL_FROM` (optional) - Default: `FleetHub <noreply@fleethub.com>`

#### Supabase
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (keep secret!)
- `SUPABASE_BUCKET_DRIVER` (optional) - Default: `driver-kyc`
- `SUPABASE_BUCKET_VEHICLE` (optional) - Default: `vehicle-docs`

#### Stripe
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_SUCCESS_URL` (optional) - Default: `https://your-app.vercel.app/driver/payments?status=success`
- `STRIPE_CANCEL_URL` (optional) - Default: `https://your-app.vercel.app/driver/payments?status=cancel`

### How to Add Environment Variables in Vercel

1. Go to your project settings
2. Navigate to **Settings → Environment Variables**
3. Add each variable for:
   - **Production** (required)
   - **Preview** (optional, for pull request previews)
   - **Development** (optional, for local development)

## Step 4: Configure Build Settings

Vercel will automatically detect the build configuration from `vercel.json` and `package.json`. The build process includes:

1. Installing dependencies (`pnpm install`)
2. Generating Prisma Client (`prisma generate` via postinstall script)
3. Building the Next.js application (`next build`)

### Build Command

The build command is configured in `vercel.json`:
```json
{
  "buildCommand": "pnpm prisma generate && pnpm build"
}
```

## Step 5: Run Database Migrations

**Important**: You need to run database migrations before your first deployment.

### Option 1: Using Vercel CLI (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Link your project:
   ```bash
   vercel link
   ```

3. Pull environment variables:
   ```bash
   vercel env pull .env.local
   ```

4. Run migrations:
   ```bash
   pnpm prisma migrate deploy
   ```

### Option 2: Using a Database Management Tool

Connect to your database and run the migrations manually:
```bash
# From your local machine with DATABASE_URL set
pnpm prisma migrate deploy
```

### Option 3: Using Vercel Build Command (Not Recommended)

You can add migration to the build command, but this is not recommended as it runs on every build and can cause issues.

## Step 6: Deploy

1. **Automatic Deployment**: If connected to Git, push to your main branch to trigger deployment
2. **Manual Deployment**: Use Vercel CLI:
   ```bash
   vercel --prod
   ```

## Step 7: Seed Initial Admin User (First Time Only)

After deployment, seed the initial admin user:

1. Use Vercel CLI to run the seed command:
   ```bash
   vercel env pull .env.local
   pnpm seed
   ```

   Or use a database management tool to run the seed script with production credentials.

2. Default admin credentials (if using defaults):
   - Email: `admin@fleet.com`
   - Password: `changeme123`
   - **⚠️ Change the password immediately after first login!**

## Step 8: Configure Stripe Webhook

1. Go to your Stripe Dashboard → **Developers → Webhooks**
2. Add endpoint: `https://your-app.vercel.app/api/stripe/webhook`
3. Select events to listen to (payment-related events)
4. Copy the webhook signing secret
5. Update `STRIPE_WEBHOOK_SECRET` in Vercel environment variables

## Step 9: Verify Deployment

1. Visit your deployed URL: `https://your-app.vercel.app`
2. Test the health endpoint: `https://your-app.vercel.app/api/health`
3. Test database connection: `https://your-app.vercel.app/api/health/db`
4. Log in with admin credentials
5. Test file uploads (Supabase storage)
6. Test payment flow (Stripe)

## Troubleshooting

### Build Failures

**Issue**: Prisma Client not found
- **Solution**: Ensure `postinstall` script runs. Check that `prisma generate` is in `package.json`

**Issue**: Database connection errors
- **Solution**: 
  - Verify `DATABASE_URL` is correct
  - Use connection pooling URL for Supabase
  - Check database allows connections from Vercel IPs

**Issue**: Environment variables not found
- **Solution**: 
  - Verify all required env vars are set in Vercel dashboard
  - Ensure they're set for the correct environment (Production/Preview)
  - Redeploy after adding new variables

### Runtime Errors

**Issue**: Supabase storage not working
- **Solution**: 
  - Verify buckets exist: `driver-kyc` and `vehicle-docs`
  - Check `SUPABASE_SERVICE_ROLE_KEY` is correct
  - Verify bucket policies allow uploads

**Issue**: Stripe payments not working
- **Solution**: 
  - Verify all Stripe env vars are set
  - Check webhook endpoint is configured correctly
  - Ensure webhook secret matches in Stripe dashboard

**Issue**: Email sending fails
- **Solution**: 
  - Verify `RESEND_API_KEY` is correct
  - Check Resend account is active
  - Verify sender domain is verified in Resend

### Database Migration Issues

**Issue**: Migrations fail during deployment
- **Solution**: 
  - Run migrations manually before deployment
  - Check database connection string is correct
  - Ensure database user has migration permissions

## Performance Optimization

### Database Connection Pooling

For Supabase, always use the connection pooling URL:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

This prevents connection limit issues in serverless environments.

### Prisma Client Optimization

The `postinstall` script ensures Prisma Client is generated during build, which is cached by Vercel for faster subsequent builds.

## Continuous Deployment

Once connected to Git:
- **Main branch** → Production deployment
- **Other branches** → Preview deployments
- **Pull requests** → Preview deployments with unique URLs

## Monitoring

- Use Vercel Analytics (already included via `@vercel/analytics`)
- Monitor function logs in Vercel dashboard
- Set up error tracking (consider Sentry integration)
- Monitor database performance in Supabase dashboard

## Security Checklist

- ✅ All secrets are in environment variables (never in code)
- ✅ `NEXTAUTH_SECRET` is strong and unique
- ✅ Database connection uses SSL
- ✅ Supabase buckets have appropriate RLS policies
- ✅ Stripe webhook secret is configured
- ✅ Admin password is changed from default
- ✅ HTTPS is enforced (automatic on Vercel)

## Next Steps

After successful deployment:

1. ✅ Set up custom domain (optional)
2. ✅ Configure DNS records
3. ✅ Set up monitoring and alerts
4. ✅ Configure backup strategy for database
5. ✅ Set up staging environment (optional)
6. ✅ Document your deployment process

## Support

For issues specific to:
- **Vercel**: [Vercel Documentation](https://vercel.com/docs)
- **Next.js**: [Next.js Documentation](https://nextjs.org/docs)
- **Prisma**: [Prisma Documentation](https://www.prisma.io/docs)
- **Supabase**: [Supabase Documentation](https://supabase.com/docs)

