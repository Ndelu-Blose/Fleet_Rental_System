import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@fleet.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123'

  console.log(`Resetting password for admin: ${adminEmail}`)
  console.log(`Using password: ${adminPassword}`)

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

  // Verify current password hash (for debugging)
  if (admin.password) {
    const testMatch = await bcrypt.compare(adminPassword, admin.password)
    console.log(`Current password matches: ${testMatch ? '✅ YES' : '❌ NO'}`)
  } else {
    console.log(`⚠️  Admin has no password set`)
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  await prisma.user.update({
    where: { id: admin.id },
    data: { password: hashedPassword },
  })

  // Verify the new password
  const verifyMatch = await bcrypt.compare(adminPassword, hashedPassword)
  console.log(`New password verified: ${verifyMatch ? '✅ YES' : '❌ NO'}`)

  console.log(`\n✅ Admin password reset successfully!`)
  console.log(`   Email: ${adminEmail}`)
  console.log(`   Password: ${adminPassword}`)
  console.log(`\n⚠️  You can now log in with these credentials.`)
}

main()
  .catch((e) => {
    console.error('❌ Error resetting password:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

