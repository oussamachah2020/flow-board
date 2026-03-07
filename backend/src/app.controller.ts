import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { TestValidationDto } from './common/dto/test-validation.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Test endpoint for ValidationPipe: accepts only { name: string }.
   * Sending unknown properties returns 400 (forbidNonWhitelisted).
   */
  @Post('test-validation')
  testValidation(@Body() dto: TestValidationDto): { name: string } {
    return { name: dto.name };
  }
}
