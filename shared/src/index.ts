// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  name: string;
  avatarUrl?: string;
}

// List types
export interface TodoList {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateListDto {
  name: string;
  description?: string;
}

export interface UpdateListDto {
  name?: string;
  description?: string;
}

// Todo item types
export type TodoPriority = 'low' | 'medium' | 'high';
export type TodoStatus = 'pending' | 'in_progress' | 'completed';

export interface TodoItem {
  id: string;
  listId: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: TodoPriority;
  status: TodoStatus;
  dueDate?: Date;
  assigneeId?: string;
  position: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTodoDto {
  listId: string;
  title: string;
  description?: string;
  priority?: TodoPriority;
  dueDate?: Date;
  assigneeId?: string;
}

export interface UpdateTodoDto {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: TodoPriority;
  status?: TodoStatus;
  dueDate?: Date | null;
  assigneeId?: string | null;
  position?: number;
}

// List member types
export type MemberRole = 'owner' | 'editor' | 'viewer';

export interface ListMember {
  id: string;
  listId: string;
  userId: string;
  role: MemberRole;
  joinedAt: Date;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Socket event types (for Phase 2)
export interface SocketEvents {
  // Client -> Server
  'join-list': { listId: string };
  'leave-list': { listId: string };
  'todo:create': CreateTodoDto;
  'todo:update': { id: string; updates: UpdateTodoDto };
  'todo:delete': { id: string };
  'todo:reorder': { id: string; newPosition: number };

  // Server -> Client
  'todo:created': TodoItem;
  'todo:updated': TodoItem;
  'todo:deleted': { id: string };
  'user:joined': { userId: string; listId: string };
  'user:left': { userId: string; listId: string };
  'presence:update': { listId: string; users: string[] };
}
