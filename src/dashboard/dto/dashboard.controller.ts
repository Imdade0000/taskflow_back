import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardStatsDto, ProductivityDataDto, RecentProjectDto, RecentTaskDto } from './dashboard-stats.dto';
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getDashboardStats(): Promise<DashboardStatsDto> {
    return this.dashboardService.getDashboardStats();
  }

  @Get('productivity')
  async getProductivityData(
    @Query('period') period: '7d' | '30d' | '3m' = '30d'
  ): Promise<ProductivityDataDto[]> {
    return this.dashboardService.getProductivityData(period);
  }

  @Get('recent-tasks')
  async getRecentTasks(@Query('limit') limit: number = 5): Promise<RecentTaskDto[]> {
    return this.dashboardService.getRecentTasks(limit);
  }

  @Get('recent-projects')
  async getRecentProjects(@Query('limit') limit: number = 4): Promise<RecentProjectDto[]> {
    return this.dashboardService.getRecentProjects(limit);
  }
}