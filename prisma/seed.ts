import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Permissions basées exactement sur vos contrôleurs
const permissionsByDomain = {
  // Permissions système (pour permissions.controller.ts)
  permissions: [
    { slug: 'permissions.list', name: 'Lister les permissions', description: 'Permission de voir la liste des permissions système' },
    { slug: 'permissions.view', name: 'Voir une permission', description: 'Permission de voir les détails d\'une permission' },
    { slug: 'permissions.create', name: 'Créer une permission', description: 'Permission de créer une nouvelle permission système' },
    { slug: 'permissions.update', name: 'Modifier une permission', description: 'Permission de modifier une permission système' },
    { slug: 'permissions.delete', name: 'Supprimer une permission', description: 'Permission de supprimer une permission système' },
  ],

  // Permissions pour les rôles système (pour les erreurs du terminal)
  roles: [
    { slug: 'roles.list', name: 'Lister les rôles', description: 'Permission de voir la liste des rôles système' },
    { slug: 'roles.view', name: 'Voir un rôle', description: 'Permission de voir les détails d\'un rôle' },
    { slug: 'roles.create', name: 'Créer un rôle', description: 'Permission de créer un nouveau rôle' },
    { slug: 'roles.update', name: 'Modifier un rôle', description: 'Permission de modifier un rôle existant' },
    { slug: 'roles.delete', name: 'Supprimer un rôle', description: 'Permission de supprimer un rôle' },
  ],

  // Permissions de membres de projet (project-member.controller.ts)
  project_members: [
    { slug: 'project.members.add', name: 'Ajouter des membres au projet', description: 'Permission d\'ajouter des utilisateurs à un projet' },
    { slug: 'project.members.view', name: 'Voir les membres du projet', description: 'Permission de voir les membres d\'un projet' },
    { slug: 'project.members.manage_roles', name: 'Gérer les rôles des membres', description: 'Permission de modifier les rôles des membres dans un projet' },
    { slug: 'project.members.remove', name: 'Retirer des membres du projet', description: 'Permission de retirer des utilisateurs d\'un projet' },
  ],

  // Permissions des permissions de projet (project-permission.controller.ts)
  projects_permissions: [
    { slug: 'projects_permissions.list', name: 'Lister les permissions de projet', description: 'Permission de voir les permissions disponibles pour les projets' },
    { slug: 'projects_permissions.view', name: 'Voir une permission de projet', description: 'Permission de voir les détails d\'une permission de projet' },
    { slug: 'projects_permissions.create', name: 'Créer une permission de projet', description: 'Permission de créer de nouvelles permissions pour les projets' },
    { slug: 'projects_permissions.update', name: 'Modifier une permission de projet', description: 'Permission de modifier une permission de projet' },
    { slug: 'projects_permissions.delete', name: 'Supprimer une permission de projet', description: 'Permission de supprimer une permission de projet' },
  ],

  // Permissions des rôles de projet (project-role.controller.ts)
  project_roles: [
    { slug: 'project_roles.list', name: 'Lister les rôles de projet', description: 'Permission de voir les rôles disponibles pour les projets' },
    { slug: 'project_roles.view', name: 'Voir un rôle de projet', description: 'Permission de voir les détails d\'un rôle de projet' },
    { slug: 'project_roles.create', name: 'Créer un rôle de projet', description: 'Permission de créer de nouveaux rôles pour les projets' },
    { slug: 'project_roles.update', name: 'Modifier un rôle de projet', description: 'Permission de modifier un rôle de projet' },
    { slug: 'project_roles.delete', name: 'Supprimer un rôle de projet', description: 'Permission de supprimer un rôle de projet' },
    { slug: 'project_roles.manage_permissions', name: 'Gérer les permissions des rôles', description: 'Permission de gérer les permissions associées aux rôles de projet' },
  ],

  // Permissions pour les projets (project.controller.ts - à ajouter si nécessaire)
  projects: [
    { slug: 'projects.list', name: 'Lister les projets', description: 'Permission de voir la liste des projets' },
    { slug: 'projects.view', name: 'Voir un projet', description: 'Permission de voir les détails d\'un projet' },
    { slug: 'projects.create', name: 'Créer un projet', description: 'Permission de créer un nouveau projet' },
    { slug: 'projects.update', name: 'Modifier un projet', description: 'Permission de modifier un projet existant' },
    { slug: 'projects.delete', name: 'Supprimer un projet', description: 'Permission de supprimer un projet' },
    { slug: 'projects.archive', name: 'Archiver un projet', description: 'Permission d\'archiver/restaurer un projet' },
  ],

  // Permissions utilisateurs (si vous avez un contrôleur users)
  users: [
    { slug: 'users.list', name: 'Lister les utilisateurs', description: 'Permission de voir la liste des utilisateurs' },
    { slug: 'users.view', name: 'Voir un utilisateur', description: 'Permission de voir les détails d\'un utilisateur' },
    { slug: 'users.create', name: 'Créer un utilisateur', description: 'Permission de créer un nouvel utilisateur' },
    { slug: 'users.update', name: 'Modifier un utilisateur', description: 'Permission de modifier un utilisateur existant' },
    { slug: 'users.delete', name: 'Supprimer un utilisateur', description: 'Permission de supprimer un utilisateur' },
  ]
};

const predefinedRoles = [
  {
    name: 'Super Admin',
    description: 'Accès complet à toutes les fonctionnalités du système',
    hasAllPermissions: true,
    permissions: []
  },
  {
    name: 'System Administrator',
    description: 'Administration du système',
    hasAllPermissions: false,
    permissions: [
      'permissions.*',
      'roles.*',
      'users.*'
    ]
  },
  {
    name: 'Project Manager',
    description: 'Gestion complète des projets et de leurs équipes',
    hasAllPermissions: false,
    permissions: [
      'projects.*',
      'project.members.*',
      'project_roles.*',
      'projects_permissions.*'
    ]
  },
  {
    name: 'Team Lead',
    description: 'Gestion d\'équipe et supervision de projets',
    hasAllPermissions: false,
    permissions: [
      'projects.list',
      'projects.view',
      'projects.update',
      'project.members.view',
      'project.members.add',
      'project.members.manage_roles',
      'project_roles.list',
      'project_roles.view'
    ]
  },
  {
    name: 'Developer',
    description: 'Développeur avec accès aux projets',
    hasAllPermissions: false,
    permissions: [
      'projects.list',
      'projects.view',
      'project.members.view'
    ]
  },
  {
    name: 'Viewer',
    description: 'Accès en lecture seule',
    hasAllPermissions: false,
    permissions: [
      'projects.list',
      'projects.view',
      'project.members.view'
    ]
  }
];

async function createPermissions() {
  const allPermissions: any[] = [];
  
  console.log('\n=== CRÉATION DES PERMISSIONS ===');
  
  for (const [domain, permissions] of Object.entries(permissionsByDomain)) {
    console.log(`\n📁 Domaine: ${domain.toUpperCase()}`);
    
    for (const permission of permissions) {
      try {
        const permissionData = {
          name: permission.name,
          slug: permission.slug,
          description: permission.description,
          domain: domain,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const createdPermission = await prisma.permission.create({
          data: permissionData
        });
        
        allPermissions.push(createdPermission);
        console.log(`   ✅ ${permission.slug}`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`   ⚪ ${permission.slug} (existe déjà)`);
          // Récupérer la permission existante
          const existing = await prisma.permission.findUnique({
            where: { slug: permission.slug }
          });
          if (existing) {
            allPermissions.push(existing);
          }
        } else {
          console.error(`   ❌ ${permission.slug}: ${error.message}`);
        }
      }
    }
  }
  
  return allPermissions;
}

async function createRolesWithPermissions(allPermissions: any[]) {
  console.log('\n=== CRÉATION DES RÔLES ===');
  
  for (const roleData of predefinedRoles) {
    console.log(`\n👥 Rôle: ${roleData.name}`);
    
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      create: {
        name: roleData.name,
        description: roleData.description,
        hasAllPermissions: roleData.hasAllPermissions,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {
        description: roleData.description,
        hasAllPermissions: roleData.hasAllPermissions,
        updatedAt: new Date()
      }
    });
    
    // Supprimer les anciennes permissions
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id }
    });
    
    if (roleData.hasAllPermissions) {
      // Assigner toutes les permissions
      for (const permission of allPermissions) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
      console.log(`   ✅ Toutes les permissions (${allPermissions.length})`);
    } else {
      let assignedCount = 0;
      // Assigner les permissions spécifiques
      for (const permissionPattern of roleData.permissions) {
        if (permissionPattern.endsWith('.*')) {
          // Permission wildcard (ex: projects.*)
          const prefix = permissionPattern.replace('.*', '');
          const matchingPermissions = allPermissions.filter(p => 
            p.slug.startsWith(prefix + '.')
          );
          
          for (const permission of matchingPermissions) {
            await prisma.rolePermission.create({
              data: {
                roleId: role.id,
                permissionId: permission.id,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
            assignedCount++;
          }
        } else {
          // Permission spécifique
          const permission = allPermissions.find(p => p.slug === permissionPattern);
          if (permission) {
            await prisma.rolePermission.create({
              data: {
                roleId: role.id,
                permissionId: permission.id,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
            assignedCount++;
          } else {
            console.log(`   ⚠️  Permission non trouvée: ${permissionPattern}`);
          }
        }
      }
      console.log(`   ✅ ${assignedCount} permissions assignées`);
    }
  }
}

async function createTestUsers() {
  console.log('\n=== CRÉATION DES UTILISATEURS ===');
  
  const testUsers = [
    {
      email: 'superadmin@example.com',
      username: 'superadmin',
      firstname: 'Super',
      lastname: 'Admin',
      password: 'SuperAdmin123!',
      roleName: 'Super Admin'
    },
    {
      email: 'project.manager@example.com',
      username: 'projectmanager',
      firstname: 'Project',
      lastname: 'Manager',
      password: 'ProjectManager123!',
      roleName: 'Project Manager'
    },
    {
      email: 'team.lead@example.com',
      username: 'teamlead',
      firstname: 'Team',
      lastname: 'Lead',
      password: 'TeamLead123!',
      roleName: 'Team Lead'
    },
    {
      email: 'developer@example.com',
      username: 'developer',
      firstname: 'John',
      lastname: 'Developer',
      password: 'Developer123!',
      roleName: 'Developer'
    }
  ];
  
  for (const userData of testUsers) {
    try {
      const role = await prisma.role.findFirst({
        where: { name: userData.roleName }
      });
      
      if (!role) {
        console.log(`   ❌ Rôle non trouvé: ${userData.roleName}`);
        continue;
      }
      
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        create: {
          email: userData.email,
          username: userData.username,
          firstname: userData.firstname,
          lastname: userData.lastname,
          password: hashedPassword,
          isActive: true,
          twoFactorEnabled: true, 
          roleId: role.id,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        update: {
          password: hashedPassword,
          roleId: role.id,
          isActive: true,
          twoFactorEnabled: true,
          updatedAt: new Date()
        }
      });
      
      console.log(`   ✅ ${userData.email} (${userData.roleName})`);
    } catch (error) {
      console.error(`   ❌ ${userData.email}: ${error.message}`);
    }
  }
}

async function verifyPermissions() {
  console.log('\n=== VÉRIFICATION DES PERMISSIONS CRITIQUES ===');
  
  // Permissions critiques basées sur vos erreurs
  const criticalPermissions = [
    'project.members.view',
    'project_roles.list',
    'projects_permissions.list',
    'roles.list',
    'permissions.list'
  ];

  for (const slug of criticalPermissions) {
    const permission = await prisma.permission.findFirst({
      where: { slug }
    });
    console.log(`   ${permission ? '✅' : '❌'} ${slug}`);
  }

  // Vérifier que le Super Admin a toutes les permissions
  const superAdmin = await prisma.user.findFirst({
    where: { email: 'superadmin@example.com' },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      }
    }
  });

  if (superAdmin?.role) {
    console.log(`\n👤 Super Admin:`);
    console.log(`   Toutes permissions: ${superAdmin.role.hasAllPermissions ? '✅' : '❌'}`);
    console.log(`   Permissions assignées: ${superAdmin.role.permissions.length}`);
    
    // Vérifier les permissions critiques pour le Super Admin
    if (superAdmin.role.hasAllPermissions) {
      console.log(`   ✅ Toutes les permissions critiques sont couvertes`);
    } else {
      criticalPermissions.forEach(criticalPerm => {
        const hasPermission = superAdmin.role!.permissions.some(
          rp => rp.permission.slug === criticalPerm
        );
        console.log(`   ${hasPermission ? '✅' : '❌'} ${criticalPerm}`);
      });
    }
  }
}

async function main() {
  try {
    console.log('🚀 SEED BASÉ SUR VOS CONTRÔLEURS RÉELS');
    console.log('=====================================');
    
    // Nettoyer les données existantes
    console.log('\n🧹 Nettoyage...');
    await prisma.rolePermission.deleteMany({});
    await prisma.permission.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.role.deleteMany({});
    
    // Créer les permissions
    const allPermissions = await createPermissions();
    
    // Créer les rôles
    await createRolesWithPermissions(allPermissions);
    
    // Créer les utilisateurs
    await createTestUsers();
    
    // Vérification finale
    await verifyPermissions();
    
    // Statistiques
    console.log('\n📊 STATISTIQUES FINALES');
    console.log('========================');
    const stats = {
      permissions: await prisma.permission.count(),
      roles: await prisma.role.count(),
      users: await prisma.user.count(),
      rolePermissions: await prisma.rolePermission.count()
    };
    
    console.log(`Permissions: ${stats.permissions}`);
    console.log(`Rôles: ${stats.roles}`);
    console.log(`Utilisateurs: ${stats.users}`);
    console.log(`Associations: ${stats.rolePermissions}`);
    
    console.log('\n🔑 COMPTES DE TEST');
    console.log('==================');
    console.log('superadmin@example.com / SuperAdmin123!');
    console.log('project.manager@example.com / ProjectManager123!');
    console.log('team.lead@example.com / TeamLead123!');
    console.log('developer@example.com / Developer123!');
    
    console.log('\n✅ SEED TERMINÉ AVEC SUCCÈS!');
    
  } catch (error) {
    console.error('❌ ERREUR PENDANT LE SEED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();