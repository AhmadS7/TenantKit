import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('dashboard/summary')
  @UseGuards(JwtAuthGuard)
  async getDashboardSummary() {
    return this.appService.getDashboardSummary();
  }
}
