import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUUID,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  dueStart?: string | Date | null;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string | Date | null;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  dueEnd?: string | Date | null;

  @ApiProperty()
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  projectStatusId: string;

  @ApiProperty()
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}