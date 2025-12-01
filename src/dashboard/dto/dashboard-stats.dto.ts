export class DashboardStatsDto {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  totalProjects: number;
  activeProjects: number;
  totalMembers: number;
  completionRate: number;
  weeklyProgress: number[];
  priorityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  statusDistribution: {
    [key: string]: number;
  };
}

export class ProductivityDataDto {
  date: string;
  completedTasks: number;
}

export class RecentTaskDto {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueStart: Date;
  project?: {
    name: string;
  };
  assignees?: Array<{
    member: {
      user: {
        firstname: string;
        lastname: string;
      };
    };
  }>;
}

export class RecentProjectDto {
  id: string;
  name: string;
  status: string;
  startDate: Date;
  endDate?: Date | null;
  progress?: number;
}