// User types
export interface User {
  id: string;
  supabaseId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  supabaseId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

// Auth types
export interface AuthUser {
  id: string;
  supabaseId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

// Invitation types
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface ListInvite {
  id: string;
  listId: string;
  email: string;
  role: MemberRole;
  invitedBy: string;
  status: InviteStatus;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateInviteDto {
  listId: string;
  email: string;
  role: MemberRole;
}

// List with member info
export interface ListWithMembers extends TodoList {
  members: ListMemberWithUser[];
  memberCount: number;
  userRole?: MemberRole;
}

export interface ListMemberWithUser extends ListMember {
  user: Pick<User, 'id' | 'email' | 'name' | 'avatarUrl'>;
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
  lastEditedBy?: string;
  version: number;
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

// Online user presence types
export interface OnlineUser {
  userId: string;
  color: string;
  name: string;
  selectedTodoId?: string;
  isTyping: boolean;
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

// Conflict resolution types
export type ConflictResolution = 'server-wins' | 'client-wins' | 'merge' | 'manual';

export interface ConflictError {
  type: 'VERSION_CONFLICT';
  todoId: string;
  clientVersion: number;
  serverVersion: number;
  serverData: TodoItem;
  message: string;
}

export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: ConflictError | { type: string; message: string };
}

// Pending operation for offline queue
export interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'reorder';
  todoId?: string;
  listId: string;
  payload: unknown;
  timestamp: number;
  retryCount: number;
  version?: number;
}

// Socket event types
export interface SocketEvents {
  // Client -> Server
  'join-list': { listId: string };
  'leave-list': { listId: string };
  'todo:create': CreateTodoDto;
  'todo:update': { id: string; updates: UpdateTodoDto; version: number };
  'todo:delete': { id: string; version: number };
  'todo:reorder': { id: string; newPosition: number };

  // Server -> Client
  'todo:created': TodoItem;
  'todo:updated': TodoItem;
  'todo:deleted': { id: string };
  'todo:conflict': ConflictError;
  'user:joined': { userId: string; listId: string };
  'user:left': { userId: string; listId: string };
  'presence:update': { listId: string; users: string[] };
}
