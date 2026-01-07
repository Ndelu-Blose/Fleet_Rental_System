import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@fleet.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123'

  console.log(`Resetting password for admin: ${adminEmail}`)

  const admin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (!admin) {
    console.error(`❌ Admin user not found: ${adminEmail}`)
    process.exit(1)
  }

  if (admin.role !== 'ADMIN') {
    console.error(`❌ User ${adminEmail} is not an admin`)
    process.exit(1)
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  await prisma.user.update({
    where: { id: admin.id },
    data: { password: hashedPassword },
  })

  console.log(`✅ Admin password reset successfully!`)
  console.log(`   Email: ${adminEmail}`)
  console.log(`   Password: ${adminPassword}`)
}

main()
  .catch((e) => {
    console.error('❌ Error resetting password:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

