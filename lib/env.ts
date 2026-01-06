export const env = {
  database: {
    url: process.env.DATABASE_URL!,
  },
  auth: {
    secret: process.env.NEXTAUTH_SECRET!,
    url: process.env.NEXTAUTH_URL || "http://localhost:3000",
  },
  mail: {
    resendApiKey: process.env.RESEND_API_KEY!,
    from: process.env.MAIL_FROM || "FleetHub <noreply@fleethub.com>",
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    bucketDriver: process.env.SUPABASE_BUCKET_DRIVER || "driver-kyc",
    bucketVehicle: process.env.SUPABASE_BUCKET_VEHICLE || "vehicle-docs",
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    successUrl: process.env.STRIPE_SUCCESS_URL || "http://localhost:3000/driver/payments?status=success",
    cancelUrl: process.env.STRIPE_CANCEL_URL || "http://localhost:3000/driver/payments?status=cancel",
  },
}
