import { IsEmail, IsNotEmpty, IsString, IsOptional, IsBoolean, IsUUID, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'Prénom de l\'utilisateur' })
  @IsNotEmpty({ message: 'Le prénom est requis' })
  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  firstname: string;

  @ApiProperty({ description: 'Nom de famille de l\'utilisateur' })
  @IsNotEmpty({ message: 'Le nom de famille est requis' })
  @IsString({ message: 'Le nom de famille doit être une chaîne de caractères' })
  lastname: string;

  @ApiProperty({ description: 'Nom d\'utilisateur unique' })
  @IsNotEmpty({ message: 'Le nom d\'utilisateur est requis' })
  @IsString({ message: 'Le nom d\'utilisateur doit être une chaîne de caractères' })
  @Length(3, 30, { message: 'Le nom d\'utilisateur doit contenir entre 3 et 30 caractères' })
  username: string;

  @ApiProperty({ description: 'Adresse email unique' })
  @IsNotEmpty({ message: 'L\'email est requis' })
  @IsEmail({}, { message: 'Format d\'email invalide' })
  email: string;

  @ApiPropertyOptional({ description: 'Numéro de téléphone unique (optionnel)' })
  @IsOptional()
  @IsString({ message: 'Le numéro de téléphone doit être une chaîne de caractères' })
  @Matches(/^(\+\d{1,3})?\s?\(?\d{1,4}\)?[\s.-]?\d{1,3}[\s.-]?\d{2,4}[\s.-]?\d{2,4}$/, {
    message: 'Format de numéro de téléphone invalide'
  })
  phone?: string;

  @ApiProperty({ description: 'Mot de passe' })
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères' })
  @Length(8, 100, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{8,}$/, {
    message: 'Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule et un chiffre'
  })
  password: string;

  @ApiProperty({ description: 'ID du rôle attribué à l\'utilisateur' })
  @IsNotEmpty({ message: 'L\'ID du rôle est requis' })
  @IsUUID(4, { message: 'Format d\'ID de rôle invalide' })
  roleId: string;

  @ApiPropertyOptional({ description: 'ID du département (optionnel)' })
  @IsOptional()
  @IsUUID(4, { message: 'Format d\'ID de département invalide' })
  departementId?: string;

  @ApiPropertyOptional({ description: 'ID de l\'utilisateur qui crée ce compte (optionnel)' })
  @IsOptional()
  @IsUUID(4, { message: 'Format d\'ID créateur invalide' })
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Authentification à deux facteurs activée' })
  @IsOptional()
  @IsBoolean({ message: 'La valeur de l\'authentification à deux facteurs doit être un booléen' })
  twoFactorEnabled?: boolean = true;

  @ApiPropertyOptional({ description: 'Utilisateur actif' })
  @IsOptional()
  @IsBoolean({ message: 'La valeur du statut d\'activité doit être un booléen' })
  isActive?: boolean = true;
}