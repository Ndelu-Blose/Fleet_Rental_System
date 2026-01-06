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
  
  const defaultSettings = [
    { key: 'payments.mode', value: 'MANUAL' },
    { key: 'payments.currency', value: 'ZAR' },
    { key: 'payments.defaultRentCycle', value: 'WEEKLY' },
    { key: 'payments.defaultDueDay', value: '25' },
    { key: 'payments.gracePeriodDays', value: '3' },
    { key: 'reminders.enabled', value: 'false' },
    { key: 'reminders.fromEmail', value: '' },
    { key: 'reminders.schedule.daysBefore', value: '3' },
    { key: 'reminders.schedule.onDueDate', value: 'true' },
    { key: 'reminders.schedule.daysOverdue', value: '3' },
  ]

  for (const setting of defaultSettings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: {}, // Don't update if exists
      create: {
        key: setting.key,
        value: setting.value,
      },
    })
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

