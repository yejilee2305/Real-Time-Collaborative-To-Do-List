import { io, Socket } from 'socket.io-client';
import { TodoItem, CreateTodoDto, UpdateTodoDto } from '@sync/shared';

// Socket event types matching the backend
interface ServerToClientEvents {
  'todo:created': (todo: TodoItem) => void;
  'todo:updated': (todo: TodoItem) => void;
  'todo:deleted': (data: { id: string; listId: string }) => void;
  'todo:reordered': (todo: TodoItem) => void;
  'user:joined': (data: { userId: string; listId: string; userCount: number }) => void;
  'user:left': (data: { userId: string; listId: string; userCount: number }) => void;
  'presence:update': (data: { listId: string; users: string[] }) => void;
  'user:typing': (data: { userId: string; listId: string; isTyping: boolean }) => void;
  'error': (data: { message: string }) => void;
}

interface ClientToServerEvents {
  'join-list': (data: { listId: string; userId: string }) => void;
  'leave-list': (data: { listId: string; userId: string }) => void;
  'todo:create': (data: CreateTodoDto & { createdBy: string }) => void;
  'todo:update': (data: { id: string; updates: UpdateTodoDto }) => void;
  'todo:delete': (data: { id: string; listId: string }) => void;
  'todo:reorder': (data: { id: string; newPosition: number; listId: string }) => void;
  'user:typing': (data: { listId: string; userId: string; isTyping: boolean }) => void;
}

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  private socket: TypedSocket | null = null;
  private currentListId: string | null = null;
  private currentUserId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // Event handlers that can be set by the store
  public onTodoCreated: ((todo: TodoItem) => void) | null = null;
  public onTodoUpdated: ((todo: TodoItem) => void) | null = null;
  public onTodoDeleted: ((data: { id: string; listId: string }) => void) | null = null;
  public onTodoReordered: ((todo: TodoItem) => void) | null = null;
  public onUserJoined: ((data: { userId: string; listId: string; userCount: number }) => void) | null = null;
  public onUserLeft: ((data: { userId: string; listId: string; userCount: number }) => void) | null = null;
  public onPresenceUpdate: ((data: { listId: string; users: string[] }) => void) | null = null;
  public onUserTyping: ((data: { userId: string; listId: string; isTyping: boolean }) => void) | null = null;
  public onError: ((data: { message: string }) => void) | null = null;
  public onConnectionChange: ((connected: boolean) => void) | null = null;

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected');
      this.reconnectAttempts = 0;
      this.onConnectionChange?.(true);

      // Rejoin list if we were in one
      if (this.currentListId && this.currentUserId) {
        this.joinList(this.currentListId, this.currentUserId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      this.onConnectionChange?.(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    // Todo events
    this.socket.on('todo:created', (todo) => {
      this.onTodoCreated?.(todo);
    });

    this.socket.on('todo:updated', (todo) => {
      this.onTodoUpdated?.(todo);
    });

    this.socket.on('todo:deleted', (data) => {
      this.onTodoDeleted?.(data);
    });

    this.socket.on('todo:reordered', (todo) => {
      this.onTodoReordered?.(todo);
    });

    // Presence events
    this.socket.on('user:joined', (data) => {
      this.onUserJoined?.(data);
    });

    this.socket.on('user:left', (data) => {
      this.onUserLeft?.(data);
    });

    this.socket.on('presence:update', (data) => {
      this.onPresenceUpdate?.(data);
    });

    this.socket.on('user:typing', (data) => {
      this.onUserTyping?.(data);
    });

    this.socket.on('error', (data) => {
      console.error('Socket error:', data.message);
      this.onError?.(data);
    });
  }

  disconnect(): void {
    if (this.currentListId && this.currentUserId) {
      this.leaveList(this.currentListId, this.currentUserId);
    }
    this.socket?.disconnect();
    this.socket = null;
  }

  joinList(listId: string, userId: string): void {
    this.currentListId = listId;
    this.currentUserId = userId;
    this.socket?.emit('join-list', { listId, userId });
  }

  leaveList(listId: string, userId: string): void {
    this.socket?.emit('leave-list', { listId, userId });
    this.currentListId = null;
  }

  createTodo(data: CreateTodoDto & { createdBy: string }): void {
    this.socket?.emit('todo:create', data);
  }

  updateTodo(id: string, updates: UpdateTodoDto): void {
    this.socket?.emit('todo:update', { id, updates });
  }

  deleteTodo(id: string, listId: string): void {
    this.socket?.emit('todo:delete', { id, listId });
  }

  reorderTodo(id: string, newPosition: number, listId: string): void {
    this.socket?.emit('todo:reorder', { id, newPosition, listId });
  }

  sendTyping(listId: string, userId: string, isTyping: boolean): void {
    this.socket?.emit('user:typing', { listId, userId, isTyping });
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Export singleton instance
export const socketService = new SocketService();
