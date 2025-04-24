import { IsEmail, IsString, IsOptional, IsBoolean, IsUUID, Length, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Prénom de l\'utilisateur' })
  @IsOptional()
  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  firstname?: string;

  @ApiPropertyOptional({ description: 'Nom de famille de l\'utilisateur' })
  @IsOptional()
  @IsString({ message: 'Le nom de famille doit être une chaîne de caractères' })
  lastname?: string;

  @ApiPropertyOptional({ description: 'Nom d\'utilisateur unique' })
  @IsOptional()
  @IsString({ message: 'Le nom d\'utilisateur doit être une chaîne de caractères' })
  @Length(3, 30, { message: 'Le nom d\'utilisateur doit contenir entre 3 et 30 caractères' })
  username?: string;

  @ApiPropertyOptional({ description: 'Adresse email unique' })
  @IsOptional()
  @IsEmail({}, { message: 'Format d\'email invalide' })
  email?: string;

  @ApiPropertyOptional({ description: 'Numéro de téléphone unique' })
  @IsOptional()
  @IsString({ message: 'Le numéro de téléphone doit être une chaîne de caractères' })
  @Matches(/^(\+\d{1,3})?\s?\(?\d{1,4}\)?[\s.-]?\d{1,3}[\s.-]?\d{2,4}[\s.-]?\d{2,4}$/, {
    message: 'Format de numéro de téléphone invalide'
  })
  phone?: string;

  @ApiPropertyOptional({ description: 'Mot de passe' })
  @IsOptional()
  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères' })
  @Length(8, 100, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{8,}$/, {
    message: 'Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule et un chiffre'
  })
  password?: string;

  @ApiPropertyOptional({ description: 'ID du rôle attribué à l\'utilisateur' })
  @IsOptional()
  @IsUUID(4, { message: 'Format d\'ID de rôle invalide' })
  roleId?: string;

  @ApiPropertyOptional({ description: 'ID du département' })
  @IsOptional()
  @IsUUID(4, { message: 'Format d\'ID de département invalide' })
  departementId?: string;

  @ApiPropertyOptional({ description: 'Authentification à deux facteurs activée' })
  @IsOptional()
  @IsBoolean({ message: 'La valeur de l\'authentification à deux facteurs doit être un booléen' })
  twoFactorEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Utilisateur actif' })
  @IsOptional()
  @IsBoolean({ message: 'La valeur du statut d\'activité doit être un booléen' })
  isActive?: boolean;
}