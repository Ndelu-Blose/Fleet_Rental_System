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
    
    return
  }

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

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

