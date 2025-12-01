import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ProjectStatusFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by status name',
    example: 'En cours',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by project ID',
    example: 'clxkjz2ml000308l0a4q3b5q9',
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status (active/inactive)',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by creation date (after)',
    example: '2023-01-01',
  })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional({
    description: 'Filter by creation date (before)',
    example: '2023-12-31',
  })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @ApiPropertyOptional({
    description: 'Search term (name or description)',
    example: 'urgent',
  })
  @IsOptional()
  @IsString()
  search?: string;
}