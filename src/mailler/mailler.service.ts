import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailerService.name);
  private readonly templatesDir: string;

  constructor(private configService: ConfigService) {
    this.templatesDir = path.join(process.cwd(), 'src/mailler/templates');
    this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('MAIL_HOST'),
        port: this.configService.get<number>('MAIL_PORT'),
        });
    
   
    this.verifyConnection();
  }

  /**
   * Vérifie la connexion au serveur SMTP
   */
  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('Connexion au serveur SMTP établie avec succès');
    } catch (error) {
      this.logger.error(`Échec de la connexion au serveur SMTP: ${error.message}`);
    }
  }

  /**
   * Charge et compile un template Handlebars
   * @param templateName Nom du fichier template sans extension
   * @param context Variables à injecter dans le template
   * @returns Le contenu HTML compilé
   */
  private async compileTemplate(templateName: string, context: any): Promise<string> {
    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
      const templateContent = await fs.promises.readFile(templatePath, 'utf-8');
      const template = handlebars.compile(templateContent);
      return template(context);
    } catch (error) {
      this.logger.error(`Erreur lors de la compilation du template ${templateName}: ${error.message}`);
      throw new Error(`Erreur lors de la compilation du template ${templateName}`);
    }
  }

  /**
   * Envoie un email
   * @param to Adresse email du destinataire
   * @param subject Sujet de l'email
   * @param html Contenu HTML de l'email
   * @param attachments Pièces jointes (optionnel)
   * @returns Résultat de l'envoi
   */
  private async sendMail(
    to: string,
    subject: string,
    html: string,
    attachments: any[] = []
  ): Promise<any> {
    try {
      const mailOptions = {
        from: `"${this.configService.get<string>('MAIL_FROM_NAME')}" <${this.configService.get<string>('MAIL_FROM_ADDRESS')}>`,
        to,
        subject,
        html,
        attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email envoyé à ${to} avec succès: ${result.messageId}`);
      return result;
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de l'email à ${to}: ${error.message}`);
      throw new Error(`Erreur lors de l'envoi de l'email: ${error.message}`);
    }
  }

  /**
   * Envoie un email de bienvenue avec les identifiants de connexion
   * @param email Email du destinataire
   * @param username Nom d'utilisateur
   * @param password Mot de passe (non crypté)
   * @param name Prénom et nom de l'utilisateur
   */
  async sendWelcomeEmail(
    email: string,
    username: string,
    password: string,
    name: string
  ): Promise<void> {
    const subject = 'Bienvenue - Vos identifiants de connexion';
    const html = await this.compileTemplate('welcome', {
      name,
      username,
      password,
      loginUrl: this.configService.get<string>('APP_URL') + '/login',
      appName: this.configService.get<string>('APP_NAME'),
      currentYear: new Date().getFullYear(),
    });

    await this.sendMail(email, subject, html);
  }

 /**
 * Envoie le code d'authentification à deux facteurs
 * @param email Email du destinataire
 * @param code Code 2FA à 6 chiffres
 * @param name Prénom et nom de l'utilisateur
 * @param isActivation Indique s'il s'agit d'une activation de 2FA (optionnel)
 */
async sendTwoFactorCode(
  email: string,
  code: string,
  name: string,
  isActivation: boolean = false
): Promise<void> {
  const subject = isActivation 
    ? 'Activation de la double authentification' 
    : 'Votre code d\'authentification';
    
  const html = await this.compileTemplate('two-factor', {
    name,
    code,
    isActivation,
    expiryMinutes: 10, 
    appName: this.configService.get<string>('APP_NAME'),
    currentYear: new Date().getFullYear(),
  });

  await this.sendMail(email, subject, html);
}

  /**
   * Envoie un email de réinitialisation de mot de passe
   * @param email Email du destinataire
   * @param resetToken Token de réinitialisation
   * @param name Prénom et nom de l'utilisateur
   */
async sendPasswordResetEmail(email: string, resetToken: string, name: string) {
  // Vérification finale du token
  if (!resetToken || resetToken.includes('undefined')) {
    throw new Error('Token invalide détecté');
  }

  // ✅ CORRECTION : Construire l'URL pour les liens directs depuis l'email
  // Cette URL utilisera l'endpoint avec redirection
  const backendUrl = this.configService.get('APP_URL') || 'http://localhost:3000';
  const resetUrl = `${backendUrl}/api/auth/reset-link?token=${resetToken}`;
  
  console.log('🔍 [MAILER] URL générée pour email:', resetUrl);
  
  await this.sendMail(
    email,
    'Réinitialisation de mot de passe',
    await this.compileTemplate('password-reset', {
      name,
      resetUrl, // URL qui redirigera vers le frontend
      expiryHours: 24,
      appName: this.configService.get('APP_NAME'),
      currentYear: new Date().getFullYear()
    })
  );
}



  /**
   * Envoie une notification de changement de mot de passe
   * @param email Email du destinataire
   * @param name Prénom et nom de l'utilisateur
   */
  async sendPasswordChangedEmail(
    email: string,
    name: string
  ): Promise<void> {
    const subject = 'Confirmation de changement de mot de passe';
    const html = await this.compileTemplate('password-changed', {
      name,
      supportEmail: this.configService.get<string>('SUPPORT_EMAIL'),
      appName: this.configService.get<string>('APP_NAME'),
      currentYear: new Date().getFullYear(),
    });

    await this.sendMail(email, subject, html);
  }

  /**
   * Envoie une notification de changement d'adresse email
   * @param email Nouvelle adresse email du destinataire
   * @param name Prénom et nom de l'utilisateur
   */
  async sendEmailChangedNotification(
    email: string,
    name: string
  ): Promise<void> {
    const subject = 'Confirmation de changement d\'adresse email';
    const html = await this.compileTemplate('email-changed', {
      name,
      supportEmail: this.configService.get<string>('SUPPORT_EMAIL'),
      appName: this.configService.get<string>('APP_NAME'),
      currentYear: new Date().getFullYear(),
    });

    await this.sendMail(email, subject, html);
  }

  /**
   * Envoie une notification lorsqu'un utilisateur est ajouté à un projet
   * @param email Email du destinataire
   * @param name Prénom et nom de l'utilisateur
   * @param projectName Nom du projet
   * @param roleName Rôle de l'utilisateur dans le projet
   */
  async sendProjectInvitation(
    email: string,
    name: string,
    projectName: string,
    roleName: string
  ): Promise<void> {
    const subject = `Invitation au projet: ${projectName}`;
    const html = await this.compileTemplate('project-invitation', {
      name,
      projectName,
      roleName,
      projectUrl: `${this.configService.get<string>('APP_URL')}/projects`,
      appName: this.configService.get<string>('APP_NAME'),
      currentYear: new Date().getFullYear(),
    });

    await this.sendMail(email, subject, html);
  }

  /**
   * Envoie une notification de compte désactivé
   * @param email Email du destinataire
   * @param name Prénom et nom de l'utilisateur
   */
  async sendAccountDisabledEmail(
    email: string,
    name: string
  ): Promise<void> {
    const subject = 'Votre compte a été désactivé';
    const html = await this.compileTemplate('account-disabled', {
      name,
      supportEmail: this.configService.get<string>('SUPPORT_EMAIL'),
      appName: this.configService.get<string>('APP_NAME'),
      currentYear: new Date().getFullYear(),
    });

    await this.sendMail(email, subject, html);
  }

  /**
   * Envoie une notification de compte réactivé
   * @param email Email du destinataire
   * @param name Prénom et nom de l'utilisateur
   */
  async sendAccountReactivatedEmail(
    email: string,
    name: string
  ): Promise<void> {
    const subject = 'Votre compte a été réactivé';
    const html = await this.compileTemplate('account-reactivated', {
      name,
      loginUrl: `${this.configService.get<string>('APP_URL')}/login`,
      appName: this.configService.get<string>('APP_NAME'),
      currentYear: new Date().getFullYear(),
    });

    await this.sendMail(email, subject, html);
  }

  /**
   * Envoie un rappel pour une tâche à venir
   * @param email Email du destinataire
   * @param name Prénom et nom de l'utilisateur
   * @param taskName Nom de la tâche
   * @param dueDate Date d'échéance de la tâche
   * @param projectName Nom du projet
   */
  async sendTaskReminderEmail(
    email: string,
    name: string,
    taskName: string,
    dueDate: Date,
    projectName: string
  ): Promise<void> {
    const subject = `Rappel: Tâche "${taskName}" à échéance proche`;
    const formattedDate = dueDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    
    const html = await this.compileTemplate('task-reminder', {
      name,
      taskName,
      dueDate: formattedDate,
      projectName,
      taskUrl: `${this.configService.get<string>('APP_URL')}/tasks`,
      appName: this.configService.get<string>('APP_NAME'),
      currentYear: new Date().getFullYear(),
    });

    await this.sendMail(email, subject, html);
  }

  /**
   * Envoie un e-mail personnalisé avec un contenu spécifique
   * @param email Email du destinataire
   * @param subject Sujet de l'email
   * @param content Contenu HTML personnalisé
   * @param attachments Pièces jointes (optionnel)
   */
  async sendCustomEmail(
    email: string,
    subject: string,
    content: string,
    attachments: any[] = []
  ): Promise<void> {
   const html = await this.compileTemplate('generic', {
      content,
      appName: this.configService.get<string>('APP_NAME'),
      currentYear: new Date().getFullYear(),
    });

    await this.sendMail(email, subject, html, attachments);
  }
}