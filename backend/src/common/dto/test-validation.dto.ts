import { IsString } from 'class-validator';

/**
 * Test DTO used to verify global ValidationPipe (whitelist, forbidNonWhitelisted, transform).
 */
export class TestValidationDto {
  @IsString()
  name!: string;
}
