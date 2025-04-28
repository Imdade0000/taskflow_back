import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsUUID, IsString } from 'class-validator';

export class ProjectFiltersDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  statusId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;
}