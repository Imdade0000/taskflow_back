import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting seed process...');

   
    const superAdminRole = await prisma.role.upsert({
      where: { name: 'Super Admin' },
      update: { 
        description: 'Role with all permissions', 
        hasAllPermissions: true 
      },
      create: {
        name: 'Super Admin',
        description: 'Role with all permissions',
        hasAllPermissions: true
      }
    });

    console.log(`Super Admin role created or updated with ID: ${superAdminRole.id}`);

    
    const allPermissions = await prisma.permission.findMany({
      where: { deletedAt: null }
    });

    console.log(`Found ${allPermissions.length} permissions to assign to Super Admin role`);

    
    for (const permission of allPermissions) {
      
      const existingRolePermission = await prisma.rolePermission.findFirst({
        where: {
          roleId: superAdminRole.id,
          permissionId: permission.id
        }
      });

      if (existingRolePermission) {
        
        if (existingRolePermission.deletedAt) {
          await prisma.rolePermission.update({
            where: { id: existingRolePermission.id },
            data: { deletedAt: null }
          });
          console.log(`Reactivated permission ${permission.name} for Super Admin role`);
        }
       
      } else {
       
        await prisma.rolePermission.create({
          data: {
            roleId: superAdminRole.id,
            permissionId: permission.id
          }
        });
        console.log(`Added permission ${permission.name} to Super Admin role`);
      }
    }

    console.log('All permissions assigned to Super Admin role');

   
    const hashedPassword = await bcrypt.hash('SuperAdmin123!', 10);
    
    const superAdminUser = await prisma.user.upsert({
      where: { email: 'superadmin@example.com' },
      update: {
        username: 'superadmin',
        firstname: 'Super',
        lastname: 'Admin',
        password: hashedPassword,
        isActive: true,
        twoFactorEnabled: true,
        roleId: superAdminRole.id
      },
      create: {
        email: 'superadmin@example.com',
        username: 'superadmin',
        firstname: 'Super',
        lastname: 'Admin',
        password: hashedPassword,
        isActive: true,
        twoFactorEnabled: true,
        roleId: superAdminRole.id
      }
    });

    console.log(`Super Admin user created or updated with ID: ${superAdminUser.id}`);
    console.log('Seed completed successfully!');

  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });