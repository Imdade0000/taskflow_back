
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CreateUserDto } from './dto/createUserDto';
import { UpdateUserDto } from './dto/updateUserDto';
import { MailerService } from 'src/mailler/mailler.service';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService,
              private readonly mailerService: MailerService
  ) {}

  /**
 * Créer un nouvel utilisateur
 * @param createUserDto - Les données de l'utilisateur à créer
 * @returns L'utilisateur créé
 * @throws {Error} si l'utilisateur existe déjà
 */
async create(createUserDto: CreateUserDto) {
  const { 
    email, 
    username, 
    password, 
    firstname, 
    lastname, 
    phone = '', 
    roleId,
    departementId,
    createdBy,
    twoFactorEnabled // Définir à false par défaut
  } = createUserDto;
  
  const userExists = await this.prismaService.user.findFirst({
    where: {
      OR: [
        { email },
        { username },
        { phone: phone || undefined }
      ]
    }
  });
  
  if (userExists) {
    throw new Error('Un utilisateur avec cet email, nom d\'utilisateur ou téléphone existe déjà');
  }
  
  const hash = await bcrypt.hash(password, 10);
  console.log('twoFactorEnabled reçu dans le DTO:', twoFactorEnabled);

  const user = await this.prismaService.user.create({
    data: {
      email,
      username,
      password: hash,
      firstname,
      lastname,
      phone,
      roleId,
      departementId,
      createdBy,
      twoFactorEnabled: twoFactorEnabled ?? true, // 👈 ici, utiliser la valeur reçue ou true par défaut
      isActive: true
    }
  });

  await this.mailerService.sendWelcomeEmail(
    user.email,
    user.username,
    password, 
    `${user.firstname} ${user.lastname}`
  );
  
  const { password: _, ...result } = user;
  return result;
}

  /**
   * Trouver tous les utilisateurs avec pagination
   * @param page - Le numéro de la page
   * @param limit - Le nombre d'utilisateurs par page
   * @param includeDeleted - Inclure les utilisateurs supprimés ou non
   * @returns Liste paginée des utilisateurs
   */
  async findAll(page = 1, limit = 10, includeDeleted = false, includeInactive = false) {
    const skip = (page - 1) * limit;
    
    const whereCondition: any = {};
    
    if (!includeDeleted) {
      whereCondition.deletedAt = null;
    }
    
    if (!includeInactive) {
      whereCondition.isActive = true;
    }
    
    const [users, total] = await Promise.all([
      this.prismaService.user.findMany({
        where: whereCondition,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          username: true,
          firstname: true,
          lastname: true,
          phone: true,
          isActive: true,
          roleId: true,
          departementId: true,
          role: {
            select: {
              name: true
            }
          },
          department: {
            select: {
              name: true
            }
          },
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          
          password: false,
          twoFactorCode: false,
          twoFactorExpiry: false
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      this.prismaService.user.count({
        where: whereCondition
      })
    ]);
    
    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Trouver un utilisateur par son ID
   * @param id - L'ID de l'utilisateur à rechercher
   * @param includeDeleted - Inclure les utilisateurs supprimés ou non
   * @param includeInactive - Inclure les utilisateurs inactifs ou non
   * @returns L'utilisateur trouvé
   * @throws {NotFoundException} si l'utilisateur n'existe pas
   */
  async findOne(id: string, includeDeleted = false, includeInactive = false) {
    const whereCondition: any = { id };
    
    if (!includeDeleted) {
      whereCondition.deletedAt = null;
    }
    
    if (!includeInactive) {
      whereCondition.isActive = true;
    }
    
    const user = await this.prismaService.user.findFirst({
      where: whereCondition,
      select: {
        id: true,
        email: true,
        username: true,
        firstname: true,
        lastname: true,
        phone: true,
        isActive: true,
        roleId: true,
        departementId: true,
        role: {
          select: {
            id: true,
            name: true
          }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        },
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        
        // Relations
        clientProfile: true,
        
        // Exclusions
        password: false,
        twoFactorCode: false,
        twoFactorExpiry: false
      }
    });
    
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }
    
    return user;
  }

  async findForTwoFactor(id: string) {
    return this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        twoFactorCode: true,
        twoFactorExpiry: true,
        twoFactorEnabled: true,
      },
    });
  }
  

  /**
   * Mettre à jour un utilisateur
   * @param id - L'ID de l'utilisateur à mettre à jour
   * @param updateUserDto - Les données de l'utilisateur à mettre à jour
   * @returns L'utilisateur mis à jour
   * @throws {NotFoundException} si l'utilisateur n'existe pas ou est supprimé
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prismaService.user.findFirst({
      where: { 
        id,
        deletedAt: null
      }
    });
    
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé ou supprimé`);
    }
    
    const updateData: any = { ...updateUserDto };
    
    // Vérifier si email ou username existe déjà pour un autre utilisateur
    if (updateData.email || updateData.username || updateData.phone) {
      const existingUser = await this.prismaService.user.findFirst({
        where: {
          OR: [
            updateData.email ? { email: updateData.email } : {},
            updateData.username ? { username: updateData.username } : {},
            updateData.phone ? { phone: updateData.phone } : {}
          ],
          NOT: { id }
        }
      });
      
      if (existingUser) {
        throw new Error('Un autre utilisateur avec cet email, nom d\'utilisateur ou téléphone existe déjà');
      }
    }
    
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    
    const updatedUser = await this.prismaService.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        firstname: true,
        lastname: true,
        phone: true,
        isActive: true,
        roleId: true,
        departementId: true,
        role: {
          select: {
            name: true
          }
        },
        department: {
          select: {
            name: true
          }
        },
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        
        password: false,
        twoFactorCode: false,
        twoFactorExpiry: false
      }
    });
    
    return updatedUser;
  }

  /**
   * Supprimer un utilisateur (soft delete)
   * @param id - L'ID de l'utilisateur à supprimer
   * @returns - Un message de succès
   * @throws {NotFoundException} si l'utilisateur n'existe pas
   */
  async remove(id: string) {
    const user = await this.prismaService.user.findFirst({
      where: { 
        id,
        deletedAt: null 
      }
    });
    
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé ou déjà supprimé`);
    }
    
    await this.prismaService.user.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        isActive: false
      }
    });
    
    return { message: `Utilisateur avec l'ID ${id} supprimé avec succès` };
  }

  /**
   * Supprimer définitivement un utilisateur (hard delete)
   * @param id - L'ID de l'utilisateur à supprimer définitivement
   * @returns - Un message de succès
   * @throws {NotFoundException} si l'utilisateur n'existe pas
   */
  async hardRemove(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id }
    });
    
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }
    
    await this.prismaService.refreshToken.deleteMany({
      where: { userId: id }
    });
    
    await this.prismaService.clientProfile.deleteMany({
      where: { userId: id }
    });
    
    await this.prismaService.notification.deleteMany({
      where: { userId: id }
    });
    
    await this.prismaService.document.deleteMany({
      where: { userId: id }
    });
    
    await this.prismaService.comment.deleteMany({
      where: { userId: id }
    });
    
    await this.prismaService.defaultTaskStatus.deleteMany({
      where: { createdBy: id }
    });
    
   await this.prismaService.user.delete({
      where: { id }
    });
    
    return { message: `Utilisateur avec l'ID ${id} supprimé définitivement` };
  }
  
  /**
   * Rechercher des utilisateurs par email, nom d'utilisateur, prénom ou nom
   * @param query - La chaîne de recherche
   * @param page - La page à afficher
   * @param limit - Le nombre d'utilisateurs par page
   * @param includeDeleted - Inclure les utilisateurs supprimés ou non
   * @param includeInactive - Inclure les utilisateurs inactifs ou non
   * @returns Liste paginée des utilisateurs correspondant à la recherche
   */
  async search(query: string, page = 1, limit = 10, includeDeleted = false, includeInactive = false) {
    const skip = (page - 1) * limit;
    
    const whereCondition: any = {
      OR: [
        { email: { contains: query } },
        { username: { contains: query } },
        { firstname: { contains: query } },
        { lastname: { contains: query } }
      ]
    };
    
    if (!includeDeleted) {
      whereCondition.deletedAt = null;
    }
    
    if (!includeInactive) {
      whereCondition.isActive = true;
    }
    
    const [users, total] = await Promise.all([
      this.prismaService.user.findMany({
        where: whereCondition,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          username: true,
          firstname: true,
          lastname: true,
          phone: true,
          isActive: true,
          roleId: true,
          departementId: true,
          role: {
            select: {
              name: true
            }
          },
          department: {
            select: {
              name: true
            }
          },
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          
          password: false,
          twoFactorCode: false,
          twoFactorExpiry: false
        }
      }),
      this.prismaService.user.count({
        where: whereCondition
      })
    ]);
    
    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Récupérer l'utilisateur courant à partir de son ID (extrait du token JWT)
   * @param userId - L'ID de l'utilisateur extrait du token JWT
   * @returns L'utilisateur connecté
   * @throws {NotFoundException} si l'utilisateur n'existe pas
   */
  async getCurrentUser(userId: string) {
    const user = await this.prismaService.user.findFirst({
      where: { 
        id: userId,
        deletedAt: null,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstname: true,
        lastname: true,
        phone: true,
        isActive: true,
        roleId: true,
        departementId: true,
        role: {
          select: {
            id: true,
            name: true,
            }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        },
        clientProfile: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        
        password: false,
        twoFactorCode: false,
        twoFactorExpiry: false
      }
    });
    
    if (!user) {
      throw new NotFoundException(`Utilisateur non trouvé, supprimé ou inactif`);
    }
    
    return user;
  }

  /**
   * Activer ou désactiver un utilisateur
   * @param id - L'ID de l'utilisateur
   * @param isActive - Activer ou désactiver l'utilisateur
   * @returns L'utilisateur mis à jour
   * @throws {NotFoundException} si l'utilisateur n'existe pas
   */
  async toggleActive(id: string, isActive: boolean) {
    const user = await this.prismaService.user.findFirst({
      where: { 
        id,
        deletedAt: null
      }
    });
    
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé ou supprimé`);
    }
    
    const updatedUser = await this.prismaService.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        username: true,
        firstname: true,
        lastname: true,
        phone: true,
        isActive: true,
        roleId: true,
        departementId: true,
        role: {
          select: {
            name: true
          }
        },
        department: {
          select: {
            name: true
          }
        },
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        
        password: false,
        twoFactorCode: false,
        twoFactorExpiry: false
      }
    });
    
    return updatedUser;
  }
  
  /**
   * Mettre à jour le département d'un utilisateur
   * @param userId - L'ID de l'utilisateur
   * @param departementId - L'ID du département
   * @returns L'utilisateur mis à jour
   */
  async updateDepartment(userId: string, departementId: string) {
    const user = await this.prismaService.user.findFirst({
      where: { 
        id: userId,
        deletedAt: null,
        isActive: true
      }
    });
    
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${userId} non trouvé, supprimé ou inactif`);
    }
    
    const department = await this.prismaService.department.findUnique({
      where: { id: departementId }
    });
    
    if (!department) {
      throw new NotFoundException(`Département avec l'ID ${departementId} non trouvé`);
    }
    
    const updatedUser = await this.prismaService.user.update({
      where: { id: userId },
      data: { departementId },
      select: {
        id: true,
        email: true,
        username: true,
        firstname: true,
        lastname: true,
        phone: true,
        isActive: true,
        roleId: true,
        departementId: true,
        department: {
          select: {
            id: true,
            name: true
          }
        },
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        
        password: false,
        twoFactorCode: false,
        twoFactorExpiry: false
      }
    });
    
    return updatedUser;
  }
  
  /**
   * Mettre à jour le rôle d'un utilisateur
   * @param userId - L'ID de l'utilisateur
   * @param roleId - L'ID du rôle
   * @returns L'utilisateur mis à jour
   */
  async updateRole(userId: string, roleId: string) {
    const user = await this.prismaService.user.findFirst({
      where: { 
        id: userId,
        deletedAt: null,
        isActive: true
      }
    });
    
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${userId} non trouvé, supprimé ou inactif`);
    }
    
    const role = await this.prismaService.role.findUnique({
      where: { id: roleId }
    });
    
    if (!role) {
      throw new NotFoundException(`Rôle avec l'ID ${roleId} non trouvé`);
    }
    
    const updatedUser = await this.prismaService.user.update({
      where: { id: userId },
      data: { roleId },
      select: {
        id: true,
        email: true,
        username: true,
        firstname: true,
        lastname: true,
        phone: true,
        isActive: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true
          }
        },
        departementId: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        
        password: false,
        twoFactorCode: false,
        twoFactorExpiry: false
      }
    });
    
    return updatedUser;
  }
  
  /**
   * Récupérer les projets associés à un utilisateur
   * @param userId - L'ID de l'utilisateur
   * @returns Liste des projets associés à l'utilisateur
   */
  async getUserProjects(userId: string) {
    const user = await this.prismaService.user.findFirst({
      where: { 
        id: userId,
        deletedAt: null,
        isActive: true
      }
    });
    
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${userId} non trouvé, supprimé ou inactif`);
    }
    
    const projectMembers = await this.prismaService.projectMember.findMany({
      where: { 
        userId,
        isActive: true,
        deletedAt: null
      },
      include: {
        project: {
          include: {
            status: true
          }
        },
        projectRole: true
      }
    });
    
    return projectMembers.map(member => ({
      projectId: member.projectId,
      project: member.project,
      role: member.projectRole,
      joinedAt: member.createdAt
    }));
  }
  
  /**
   * Configurer l'authentification à deux facteurs pour un utilisateur
   * @param userId - L'ID de l'utilisateur
   * @param enable - Activer ou désactiver l'authentification à deux facteurs
   * @returns L'utilisateur mis à jour
   */
  async configureTwoFactor(userId: string, enable: boolean) {
    const user = await this.prismaService.user.findFirst({
      where: { 
        id: userId,
        deletedAt: null,
        isActive: true
      }
    });
    
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${userId} non trouvé, supprimé ou inactif`);
    }
    
    const updatedUser = await this.prismaService.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: enable },
      select: {
        id: true,
        email: true,
        username: true,
        firstname: true,
        lastname: true,
        phone: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        
        password: false,
        twoFactorCode: false,
        twoFactorExpiry: false
      }
    });
    
    return updatedUser;
  }

   /**
   * Active la double authentification pour un utilisateur
   * @param userId - L'ID de l'utilisateur
   * @returns L'utilisateur mis à jour
   * @throws {NotFoundException} si l'utilisateur n'existe pas
   */
  async enableTwoFactor(userId: string) {
    const user = await this.prismaService.user.findFirst({
      where: { 
        id: userId,
        deletedAt: null,
        isActive: true
      }
    });
    
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${userId} non trouvé, supprimé ou inactif`);
    }
    
    const updatedUser = await this.prismaService.user.update({
      where: { id: userId },
      data: { 
        twoFactorEnabled: true,
        twoFactorCode: null,  // Réinitialise le code si un code existait
        twoFactorExpiry: null // Réinitialise l'expiration
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstname: true,
        lastname: true,
        phone: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    return updatedUser;
  }

  /**
   * Désactive la double authentification pour un utilisateur
   * @param userId - L'ID de l'utilisateur
   * @returns L'utilisateur mis à jour
   * @throws {NotFoundException} si l'utilisateur n'existe pas
   */
  async disableTwoFactor(userId: string) {
    if (!userId) {
      throw new Error('User ID manquant pour la désactivation du 2FA');
    }
  
    return await this.prismaService.user.update({
      where: {
        id: userId, // Assuré que c’est bien défini ici
      },
      data: {
        twoFactorEnabled: false,
        twoFactorCode: null,
        twoFactorExpiry: null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstname: true,
        lastname: true,
        phone: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
  



  /**
   * Trouve un utilisateur par son nom d'utilisateur
   * @param username - Le nom d'utilisateur à rechercher
   * @returns L'utilisateur trouvé ou null
   */
  async findByUsername(username: string) {
    return this.prismaService.user.findFirst({
      where: { 
        username,
        deletedAt: null,
        isActive: true
      }
    });
  }

  /**
   * Met à jour le code 2FA d'un utilisateur
   * @param userId - L'ID de l'utilisateur
   * @param twoFactorCode - Le code 2FA à enregistrer
   * @returns L'utilisateur mis à jour
   * @throws {NotFoundException} si l'utilisateur n'existe pas
   */
  async updateTwoFactorCode(userId: string, twoFactorCode: string) {
    const user = await this.prismaService.user.findFirst({
      where: { 
        id: userId,
        deletedAt: null,
        isActive: true
      }
    });
    
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${userId} non trouvé, supprimé ou inactif`);
    }
    
    const twoFactorExpiry = new Date();
    twoFactorExpiry.setMinutes(twoFactorExpiry.getMinutes() + 10);
    
    await this.prismaService.user.update({
      where: { id: userId },
      data: { 
        twoFactorCode,
        twoFactorExpiry
      }
    });
    
    return true;
  }

  /**
   * Vérifie si le code 2FA fourni est valide pour l'utilisateur
   * @param userId - L'ID de l'utilisateur
   * @param code - Le code 2FA à vérifier
   * @returns true si le code est valide, false sinon
   */
  async verifyTwoFactorCode(userId: string, code: string) {
    const user = await this.prismaService.user.findFirst({
      where: { 
        id: userId,
        deletedAt: null,
        isActive: true
      }
    });
    
    if (!user || !user.twoFactorCode || !user.twoFactorExpiry) {
      return false;
    }
    
    if (user.twoFactorExpiry < new Date()) {
      return false;
    }
    
    try {
      const SECRET_KEY = process.env.TWO_FACTOR_SECRET || 'your-secret-key';
      
      // Calcul de la clé à partir du secret
      const key = crypto.createHash('sha256').update(String(SECRET_KEY)).digest('base64').substring(0, 32);
      
      const [ivHex, encryptedData] = user.twoFactorCode.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      const isValid = decrypted === code;
      
      if (isValid) {
       await this.prismaService.user.update({
          where: { id: userId },
          data: { 
            twoFactorCode: null,
            twoFactorExpiry: null
          }
        });
      }
      
      return isValid;
    } catch (error) {
      console.error('Erreur lors du déchiffrement du code 2FA:', error);
      return false;
    }
  }

  /**
 * Trouve un utilisateur par son email
 * @param email - L'email de l'utilisateur à rechercher
 * @returns L'utilisateur trouvé ou null
 */
async findByEmail(email: string) {
  return this.prismaService.user.findFirst({
    where: { 
      email,
      deletedAt: null,
      isActive: true
    },
    select: {
      id: true,
      email: true,
      username: true,
      firstname: true,
      lastname: true,
      phone: true,
      password: true, // On inclut le password pour les vérifications
      isActive: true,
      twoFactorEnabled: true,
      twoFactorCode: true,
      twoFactorExpiry: true,
      roleId: true,
      departementId: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

/**
 * Met à jour le mot de passe d'un utilisateur
 * @param userId - L'ID de l'utilisateur
 * @param newPassword - Le nouveau mot de passe (non hashé)
 * @returns true si la mise à jour a réussi
 * @throws {NotFoundException} si l'utilisateur n'existe pas
 */
async updatePassword(userId: string, newPassword: string): Promise<boolean> {
  // Vérifier que l'utilisateur existe
  const user = await this.prismaService.user.findFirst({
    where: { 
      id: userId,
      deletedAt: null
    }
  });

  if (!user) {
    throw new NotFoundException(`Utilisateur avec l'ID ${userId} non trouvé ou supprimé`);
  }

  // Hasher le nouveau mot de passe
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Mettre à jour le mot de passe
  await this.prismaService.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });

  return true;
}
}
