import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { TodoItem, CreateTodoDto, UpdateTodoDto, OnlineUser } from '@sync/shared';
import * as todosService from '../services/todos';

// Predefined colors for users
const USER_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

// Track users in each list room with full presence info
const listUsers = new Map<string, Map<string, OnlineUser>>();
// Track which user is typing in which list
const typingUsers = new Map<string, Map<string, NodeJS.Timeout>>();
// Track color assignments per list
const colorAssignments = new Map<string, Map<string, string>>();

function getColorForUser(listId: string, userId: string): string {
  if (!colorAssignments.has(listId)) {
    colorAssignments.set(listId, new Map());
  }
  const listColors = colorAssignments.get(listId)!;

  if (listColors.has(userId)) {
    return listColors.get(userId)!;
  }

  // Assign next available color
  const usedColors = new Set(listColors.values());
  const availableColor = USER_COLORS.find((c) => !usedColors.has(c)) || USER_COLORS[listColors.size % USER_COLORS.length];
  listColors.set(userId, availableColor);
  return availableColor;
}

export interface ServerToClientEvents {
  'todo:created': (todo: TodoItem) => void;
  'todo:updated': (todo: TodoItem) => void;
  'todo:deleted': (data: { id: string; listId: string }) => void;
  'todo:reordered': (todo: TodoItem) => void;
  'user:joined': (data: { user: OnlineUser; listId: string }) => void;
  'user:left': (data: { userId: string; listId: string }) => void;
  'presence:update': (data: { listId: string; users: OnlineUser[] }) => void;
  'user:typing': (data: { userId: string; listId: string; isTyping: boolean }) => void;
  'user:selecting': (data: { userId: string; listId: string; todoId: string | null }) => void;
  'error': (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  'join-list': (data: { listId: string; userId: string; userName: string }) => void;
  'leave-list': (data: { listId: string; userId: string }) => void;
  'todo:create': (data: CreateTodoDto & { createdBy: string }) => void;
  'todo:update': (data: { id: string; updates: UpdateTodoDto }) => void;
  'todo:delete': (data: { id: string; listId: string }) => void;
  'todo:reorder': (data: { id: string; newPosition: number; listId: string }) => void;
  'user:typing': (data: { listId: string; userId: string; isTyping: boolean }) => void;
  'user:selecting': (data: { listId: string; userId: string; todoId: string | null }) => void;
}

interface SocketData {
  userId: string;
  userName: string;
  currentListId: string | null;
}

export function setupSocketServer(httpServer: HttpServer): Server {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>(
    httpServer,
    {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    }
  );

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Initialize socket data
    socket.data.currentListId = null;

    // Handle joining a list room
    socket.on('join-list', ({ listId, userId, userName }) => {
      // Leave previous list if any
      if (socket.data.currentListId) {
        leaveList(socket, socket.data.currentListId, socket.data.userId);
      }

      // Join new list
      socket.join(listId);
      socket.data.userId = userId;
      socket.data.userName = userName;
      socket.data.currentListId = listId;

      // Create user presence info
      const color = getColorForUser(listId, userId);
      const userPresence: OnlineUser = {
        userId,
        color,
        name: userName,
        isTyping: false,
        joinedAt: new Date(),
      };

      // Track user in list
      if (!listUsers.has(listId)) {
        listUsers.set(listId, new Map());
      }
      listUsers.get(listId)!.set(userId, userPresence);

      const users = Array.from(listUsers.get(listId)?.values() || []);
      console.log(`👤 User ${userName} (${userId}) joined list ${listId}. Users: ${users.length}`);

      // Broadcast to others in the list
      socket.to(listId).emit('user:joined', {
        user: userPresence,
        listId,
      });

      // Send presence update to all in list (including joiner)
      io.to(listId).emit('presence:update', { listId, users });
    });

    // Handle leaving a list room
    socket.on('leave-list', ({ listId, userId }) => {
      leaveList(socket, listId, userId);
    });

    // Handle creating a todo
    socket.on('todo:create', async (data) => {
      try {
        const todo = await todosService.createTodo(
          {
            listId: data.listId,
            title: data.title,
            description: data.description,
            priority: data.priority,
            dueDate: data.dueDate,
            assigneeId: data.assigneeId,
          },
          data.createdBy
        );

        // Broadcast to all users in the list (including sender)
        io.to(data.listId).emit('todo:created', todo);
        console.log(`✅ Todo created: ${todo.id} in list ${data.listId}`);
      } catch (error) {
        console.error('Error creating todo:', error);
        socket.emit('error', { message: 'Failed to create todo' });
      }
    });

    // Handle updating a todo
    socket.on('todo:update', async ({ id, updates }) => {
      try {
        const todo = await todosService.updateTodo(id, updates);
        if (todo) {
          // Broadcast to all users in the list
          io.to(todo.listId).emit('todo:updated', todo);
          console.log(`✏️ Todo updated: ${id}`);
        }
      } catch (error) {
        console.error('Error updating todo:', error);
        socket.emit('error', { message: 'Failed to update todo' });
      }
    });

    // Handle deleting a todo
    socket.on('todo:delete', async ({ id, listId }) => {
      try {
        const deleted = await todosService.deleteTodo(id);
        if (deleted) {
          // Broadcast to all users in the list
          io.to(listId).emit('todo:deleted', { id, listId });
          console.log(`🗑️ Todo deleted: ${id}`);
        }
      } catch (error) {
        console.error('Error deleting todo:', error);
        socket.emit('error', { message: 'Failed to delete todo' });
      }
    });

    // Handle reordering a todo
    socket.on('todo:reorder', async ({ id, newPosition, listId }) => {
      try {
        const todo = await todosService.reorderTodo(id, newPosition);
        if (todo) {
          // Broadcast to all users in the list
          io.to(listId).emit('todo:reordered', todo);
          console.log(`🔄 Todo reordered: ${id} to position ${newPosition}`);
        }
      } catch (error) {
        console.error('Error reordering todo:', error);
        socket.emit('error', { message: 'Failed to reorder todo' });
      }
    });

    // Handle typing indicator
    socket.on('user:typing', ({ listId, userId, isTyping }) => {
      if (!typingUsers.has(listId)) {
        typingUsers.set(listId, new Map());
      }
      const listTyping = typingUsers.get(listId)!;

      // Update user presence
      if (listUsers.has(listId) && listUsers.get(listId)!.has(userId)) {
        listUsers.get(listId)!.get(userId)!.isTyping = isTyping;
      }

      // Clear existing timeout for this user
      if (listTyping.has(userId)) {
        clearTimeout(listTyping.get(userId));
        listTyping.delete(userId);
      }

      if (isTyping) {
        // Set timeout to auto-clear typing status after 3 seconds
        const timeout = setTimeout(() => {
          listTyping.delete(userId);
          if (listUsers.has(listId) && listUsers.get(listId)!.has(userId)) {
            listUsers.get(listId)!.get(userId)!.isTyping = false;
          }
          socket.to(listId).emit('user:typing', { userId, listId, isTyping: false });
        }, 3000);
        listTyping.set(userId, timeout);
      }

      // Broadcast typing status to others in the list
      socket.to(listId).emit('user:typing', { userId, listId, isTyping });
    });

    // Handle todo selection (for highlighting)
    socket.on('user:selecting', ({ listId, userId, todoId }) => {
      // Update user presence
      if (listUsers.has(listId) && listUsers.get(listId)!.has(userId)) {
        listUsers.get(listId)!.get(userId)!.selectedTodoId = todoId || undefined;
      }

      // Broadcast selection to others
      socket.to(listId).emit('user:selecting', { userId, listId, todoId });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      if (socket.data.currentListId && socket.data.userId) {
        leaveList(socket, socket.data.currentListId, socket.data.userId);
      }
    });
  });

  function leaveList(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>,
    listId: string,
    userId: string
  ) {
    socket.leave(listId);

    // Remove user from list tracking
    if (listUsers.has(listId)) {
      listUsers.get(listId)!.delete(userId);
      if (listUsers.get(listId)!.size === 0) {
        listUsers.delete(listId);
        colorAssignments.delete(listId);
      }
    }

    // Clear typing status
    if (typingUsers.has(listId) && typingUsers.get(listId)!.has(userId)) {
      clearTimeout(typingUsers.get(listId)!.get(userId));
      typingUsers.get(listId)!.delete(userId);
    }

    const users = Array.from(listUsers.get(listId)?.values() || []);
    console.log(`👤 User ${userId} left list ${listId}. Users: ${users.length}`);

    // Broadcast to others in the list
    socket.to(listId).emit('user:left', {
      userId,
      listId,
    });

    // Send presence update
    io.to(listId).emit('presence:update', { listId, users });

    socket.data.currentListId = null;
  }

  return io;
}
