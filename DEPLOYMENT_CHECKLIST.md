# Vercel Deployment Checklist

Use this checklist to ensure a smooth deployment to Vercel.

## Pre-Deployment

- [ ] Code is pushed to Git repository
- [ ] All migrations are committed to repository
- [ ] Local build succeeds: `pnpm build`
- [ ] Database is set up and accessible
- [ ] Supabase buckets are created (`driver-kyc`, `vehicle-docs`)
- [ ] Stripe account is configured
- [ ] Resend account is configured

## Vercel Configuration

- [ ] Project is imported in Vercel
- [ ] Build settings are correct (auto-detected from `vercel.json`)

## Environment Variables

Add all these in Vercel Dashboard → Settings → Environment Variables:

### Database
- [ ] `DATABASE_URL` - PostgreSQL connection string (use pooling URL for Supabase)

### Authentication
- [ ] `NEXTAUTH_SECRET` - Generated with `openssl rand -base64 32`
- [ ] `NEXTAUTH_URL` - Production URL (e.g., `https://your-app.vercel.app`)

### Email
- [ ] `RESEND_API_KEY` - Resend API key
- [ ] `MAIL_FROM` (optional) - Custom from address

### Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- [ ] `SUPABASE_BUCKET_DRIVER` (optional) - Default: `driver-kyc`
- [ ] `SUPABASE_BUCKET_VEHICLE` (optional) - Default: `vehicle-docs`

### Stripe
- [ ] `STRIPE_SECRET_KEY` - Stripe secret key
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- [ ] `STRIPE_SUCCESS_URL` (optional) - Success redirect URL
- [ ] `STRIPE_CANCEL_URL` (optional) - Cancel redirect URL

## Database Setup

- [ ] Database migrations are run: `pnpm prisma migrate deploy`
- [ ] Initial admin user is seeded: `pnpm seed`
- [ ] Database connection is tested

## Stripe Webhook

- [ ] Webhook endpoint is configured in Stripe Dashboard
- [ ] Webhook URL: `https://your-app.vercel.app/api/stripe/webhook`
- [ ] Webhook events are selected (checkout.session.completed)
- [ ] `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard

## Post-Deployment Verification

- [ ] Application loads at production URL
- [ ] Health check passes: `/api/health`
- [ ] Database connection works: `/api/health/db`
- [ ] Admin login works
- [ ] File uploads work (Supabase storage)
- [ ] Payment flow works (Stripe)
- [ ] Email sending works (Resend)

## Security

- [ ] All secrets are in environment variables (not in code)
- [ ] `NEXTAUTH_SECRET` is strong and unique
- [ ] Database connection uses SSL
- [ ] Admin password is changed from default
- [ ] HTTPS is enforced (automatic on Vercel)

## Monitoring

- [ ] Vercel Analytics is enabled (already included)
- [ ] Error tracking is set up (optional: Sentry)
- [ ] Database monitoring is configured
- [ ] Function logs are accessible

## Documentation

- [ ] Team members have access to deployment guide
- [ ] Environment variables are documented
- [ ] Deployment process is documented

---

**Need help?** See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed instructions.

