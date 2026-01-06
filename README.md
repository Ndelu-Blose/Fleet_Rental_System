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

See `.env.example` for all required environment variables. Key variables include:

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Secret for NextAuth (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL`: Your application URL
- `RESEND_API_KEY`: Resend API key for sending emails
- `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`: Supabase credentials for file storage
- `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`: Stripe credentials for payments

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

