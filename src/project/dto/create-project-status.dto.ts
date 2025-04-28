import { IsString } from 'class-validator';

export class CreateProjectStatusDto {
  @IsString()
  name: string;

  @IsString()
  color: string;
}
