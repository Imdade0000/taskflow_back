import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  
  const roles = ['SUPER_ADMIN', 'ADMIN', 'USER']

  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        id: uuidv4(),
        name: roleName,
        description: `${roleName} role`,
      },
    })
  }

  
  const hashedPassword = await bcrypt.hash('SuperSecurePassword123!', 10)

  const superAdminUser = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      id: uuidv4(),
      userId: `USR-${Date.now()}`,
      firstname: 'Super',
      lastname: 'Admin',
      username: 'superadmin',
      email: 'superadmin@example.com',
      password: hashedPassword,
      isActive: true,
      roles: {
        connect: {
          name: 'SUPER_ADMIN',
        },
      },
    },
  })

  console.log('Seed completed ✅')
  console.log('Super Admin User:', superAdminUser)
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
