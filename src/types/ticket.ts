export type TicketPriority = 'low' | 'medium' | 'high' | 'critical' | 'deadline';

export type TicketStatus = 'new' | 'in_progress' | 'awaiting' | 'resolved' | 'closed';

export type UserRole = 'admin' | 'executor' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface Comment {
  id: string;
  ticketId: string;
  userId: string;
  user?: User;
  content: string;
  createdAt: Date;
  isInternal?: boolean;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  categoryId: string;
  category?: Category;
  createdBy: string;
  creator?: User;
  assigneeId?: string;
  assignee?: User;
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
  comments?: Comment[];
}

export interface TicketStats {
  total: number;
  new: number;
  inProgress: number;
  awaiting: number;
  resolved: number;
  closed: number;
}

export const priorityLabels: Record<TicketPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
  deadline: 'Срок',
};

export const statusLabels: Record<TicketStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  awaiting: 'Ожидает ответа',
  resolved: 'Решена',
  closed: 'Закрыта',
};

export const roleLabels: Record<UserRole, string> = {
  admin: 'Администратор',
  executor: 'Исполнитель',
  user: 'Пользователь',
};
