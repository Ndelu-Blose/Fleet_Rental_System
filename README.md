# FleetHub

A comprehensive fleet rental management system built with Next.js, Prisma, and PostgreSQL. This system allows administrators to manage vehicles, drivers, contracts, and payments, while drivers can manage their profiles, documents, and rental payments.

## Features

### Admin Features
- **Vehicle Management**: Add, edit, and manage vehicles with compliance tracking
- **Driver Management**: Create driver accounts and manage driver profiles
- **Contract Management**: Create and manage rental contracts
- **Payment Tracking**: Monitor payment status and history
- **Document Verification**: Review and approve driver verification documents
- **Analytics Dashboard**: View system-wide analytics and metrics
- **Maintenance Tracking**: Track vehicle maintenance and costs

### Driver Features
- **Profile Management**: Update personal information and address
- **Document Upload**: Upload required verification documents
- **Contract Viewing**: View active rental contract details
- **Payment Management**: View payment history and make payments via Stripe
- **Location Verification**: Verify and update location

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **File Storage**: Supabase Storage
- **Payments**: Stripe
- **Email**: Resend
- **UI Components**: Radix UI + Tailwind CSS
- **TypeScript**: Full type safety

## Prerequisites

- Node.js 18+ and pnpm (or npm/yarn)
- PostgreSQL database
- Supabase account (for file storage)
- Stripe account (for payments)
- Resend account (for emails)

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fleet-rental-system
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in all required environment variables in `.env`

4. **Set up the database**
   ```bash
   # Generate Prisma Client
   pnpm prisma generate
   
   # Run migrations
   pnpm prisma migrate dev
   ```

5. **Run the development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Environment Variables

### Required Variables

#### Database
- `DATABASE_URL` - PostgreSQL connection string (use connection pooling URL for serverless)

#### Authentication
- `NEXTAUTH_SECRET` - Secret for NextAuth (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Your application URL (e.g., `http://localhost:3000` for dev, `https://your-app.vercel.app` for prod)

#### Email (Resend)
- `RESEND_API_KEY` - Resend API key for sending emails
- `MAIL_FROM` (optional) - Default: `FleetHub <noreply@fleethub.com>`

#### Supabase
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only, keep secret!)
- `SUPABASE_BUCKET_DRIVER` (optional) - Default: `driver-kyc`
- `SUPABASE_BUCKET_VEHICLE` (optional) - Default: `vehicle-docs`

#### Stripe
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_SUCCESS_URL` (optional) - Success redirect URL
- `STRIPE_CANCEL_URL` (optional) - Cancel redirect URL

#### Admin Seeding (Optional)
- `ADMIN_EMAIL` - Default: `admin@fleet.com`
- `ADMIN_PASSWORD` - Default: `changeme123`
- `ADMIN_NAME` - Default: `Admin User`

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed environment variable setup instructions.

## Database Schema

The system uses the following main models:
- `User`: User accounts (Admin/Driver)
- `DriverProfile`: Extended driver information
- `Vehicle`: Vehicle inventory
- `RentalContract`: Rental agreements
- `Payment`: Payment records
- `DriverDocument`: Driver verification documents
- `VehicleDocument`: Vehicle-related documents
- `VehicleMaintenance`: Maintenance records
- `VehicleCost`: Cost tracking

See `prisma/schema.prisma` for the complete schema.

## Project Structure

```
├── app/                    # Next.js app router pages
│   ├── admin/             # Admin dashboard pages
│   ├── driver/            # Driver portal pages
│   ├── api/               # API routes
│   └── login/             # Authentication pages
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── ...               # Feature-specific components
├── lib/                   # Utility libraries
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Prisma client
│   ├── stripe.ts         # Stripe integration
│   └── ...               # Other utilities
├── prisma/                # Database schema and migrations
└── public/                # Static assets
```

## Development

- **Type checking**: `pnpm type-check` (if configured)
- **Linting**: `pnpm lint`
- **Build**: `pnpm build`
- **Start production**: `pnpm start`

## Production Deployment

### Vercel Deployment (Recommended)

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed Vercel deployment instructions.

Quick steps:
1. Push your code to a Git repository
2. Import project in Vercel
3. Configure all environment variables in Vercel dashboard
4. Run database migrations: `pnpm prisma migrate deploy`
5. Deploy!

### Other Platforms

1. Set all environment variables in your hosting platform
2. Run database migrations: `pnpm prisma migrate deploy`
3. Build the application: `pnpm build`
4. Start the server: `pnpm start`

## Security Notes

- Never commit `.env` files
- Use strong `NEXTAUTH_SECRET` values
- Keep Stripe webhook secrets secure
- Regularly update dependencies
- Use environment-specific database credentials

## License

[Add your license here]

## Support

[Add support information here]

