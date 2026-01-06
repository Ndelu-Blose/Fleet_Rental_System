import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@fleet.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123'
  const adminName = process.env.ADMIN_NAME || 'Admin User'

  console.log('Seeding database...')

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (existingAdmin) {
    console.log(`Admin user already exists: ${adminEmail}`)
    
    // Update password if it's the default and ADMIN_PASSWORD is set
    if (process.env.ADMIN_PASSWORD && existingAdmin.role === 'ADMIN') {
      const hashedPassword = await bcrypt.hash(adminPassword, 10)
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { password: hashedPassword },
      })
      console.log('Admin password updated')
    }
  } else {
    // Create admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 10)

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        password: hashedPassword,
        role: 'ADMIN',
        isEmailVerified: true,
        isActive: true,
      },
    })

    console.log(`✅ Admin user created successfully!`)
    console.log(`   Email: ${admin.email}`)
    console.log(`   Password: ${adminPassword}`)
    console.log(`   ⚠️  Please change the default password after first login!`)
  }

  // Seed default app settings
  console.log('Seeding app settings...')
  
  const defaults: Record<string, any> = {
    // Company
    "company.name": "FleetHub",
    "company.email": "",
    "company.phone": "",
    "company.whatsapp": "",
            "company.address": "",
            "company.currency": "ZAR",

            // Banking Details (structured)
            "company.bank.name": "",
            "company.bank.accountHolder": "",
            "company.bank.accountNumber": "",
            "company.bank.branchCode": "",
            "company.bank.accountType": "",
            "company.bank.referencePrefix": "",

    // Payments
    "payments.mode": "MANUAL", // MANUAL | STRIPE
    "payments.rentCycleDefault": "MONTHLY", // WEEKLY | MONTHLY
    "payments.graceDays": "3",
    "payments.lateFeeEnabled": "false",
    "payments.lateFeeType": "FLAT", // FLAT | PERCENT
    "payments.lateFeeValue": "0",
    "payments.autoGenerateNext": "true",

    // Notifications
    "notifications.enabled": "true",
    "notifications.reminderBeforeDays": "3",
    "notifications.reminderOnDueDate": "true",
    "notifications.reminderOverdueAfterDays": "3",
    "notifications.fromEmail": "",
    "notifications.template.paymentReminder": "Hi {{driverName}}, your rental payment of {{amount}} is due on {{dueDate}}.",
    "notifications.template.overdueNotice": "Hi {{driverName}}, your payment of {{amount}} is overdue since {{dueDate}}.",
    "notifications.template.docApproved": "Hi {{driverName}}, your document was approved.",
    "notifications.template.docRejected": "Hi {{driverName}}, your document was rejected: {{reason}}.",

    // Contracts & pricing
    "contracts.default.carAmount": "0",
    "contracts.default.bikeAmount": "0",
    "contracts.depositEnabled": "false",
    "contracts.depositAmount": "0",
    "contracts.allowedFrequencies": JSON.stringify(["WEEKLY", "MONTHLY"]),
    "contracts.termsText": "Rental terms go here...",

    // Onboarding
    "onboarding.locationRequired": "true",
    "onboarding.requiredFields": JSON.stringify([
      "fullName",
      "idNumber",
      "address",
      "driverPhoto"
    ]),
    "onboarding.requiredDocuments": JSON.stringify([
      "CERTIFIED_ID",
      "PROOF_OF_RESIDENCE",
      "DRIVERS_LICENSE"
    ]),
    "onboarding.progressWeights": JSON.stringify({
      profile: 40,
      documents: 40,
      location: 20
    }),

    // System
    "system.maintenanceMode": "false"
  };

  for (const [key, value] of Object.entries(defaults)) {
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) }
    });
  }

  console.log('✅ Default app settings seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

