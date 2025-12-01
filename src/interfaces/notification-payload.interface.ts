// interfaces/notification-payload.interface.ts
export interface TaskAssignmentPayload {
  assignedUserIds: string[];
  taskTitle: string;
  taskId: string;
  assignedBy: string;
}

export interface TaskCompletionPayload {
  completedByUserId: string;
  taskTitle: string;
  taskId: string;
}

export interface TaskCommentPayload {
  commentAuthor: string;
  taskTitle: string;
  taskId: string;
  mentionedUserIds: string[];
  commentId?: string;
}

export interface TaskReminderPayload {
  taskTitle: string;
  taskId: string;
  userIds: string[];
  reminderType: 'due_soon' | 'overdue' | 'custom' | 'deleted';
}

export interface DeadlineReminderPayload {
  taskTitle: string;
  taskId: string;
  userIds: string[];
  deadline: Date;
}

export interface ProjectUpdatePayload {
  projectName: string;
  projectId: string;
  updateType: 'created' | 'updated' | 'completed' | 'member_added' | 'member_removed';
  userIds: string[];
  updatedBy: string;
}