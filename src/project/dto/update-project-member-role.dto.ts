// dto/update-project-member-role.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateProjectMemberRoleDto {
  @ApiProperty({
    description: 'ID du nouveau rôle de projet à assigner au membre',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  projectRoleId: string;
}