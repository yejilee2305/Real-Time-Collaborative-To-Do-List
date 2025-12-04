import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { TodoItem, CreateTodoDto, UpdateTodoDto } from '@sync/shared';
import * as todosService from '../services/todos';

// Track users in each list room
const listUsers = new Map<string, Set<string>>();
// Track which user is typing in which list
const typingUsers = new Map<string, Map<string, NodeJS.Timeout>>();

export interface ServerToClientEvents {
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

export interface ClientToServerEvents {
  'join-list': (data: { listId: string; userId: string }) => void;
  'leave-list': (data: { listId: string; userId: string }) => void;
  'todo:create': (data: CreateTodoDto & { createdBy: string }) => void;
  'todo:update': (data: { id: string; updates: UpdateTodoDto }) => void;
  'todo:delete': (data: { id: string; listId: string }) => void;
  'todo:reorder': (data: { id: string; newPosition: number; listId: string }) => void;
  'user:typing': (data: { listId: string; userId: string; isTyping: boolean }) => void;
}

interface SocketData {
  userId: string;
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
    socket.on('join-list', ({ listId, userId }) => {
      // Leave previous list if any
      if (socket.data.currentListId) {
        leaveList(socket, socket.data.currentListId, socket.data.userId);
      }

      // Join new list
      socket.join(listId);
      socket.data.userId = userId;
      socket.data.currentListId = listId;

      // Track user in list
      if (!listUsers.has(listId)) {
        listUsers.set(listId, new Set());
      }
      listUsers.get(listId)!.add(userId);

      const users = Array.from(listUsers.get(listId) || []);
      console.log(`👤 User ${userId} joined list ${listId}. Users: ${users.length}`);

      // Broadcast to others in the list
      socket.to(listId).emit('user:joined', {
        userId,
        listId,
        userCount: users.length,
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

      // Clear existing timeout for this user
      if (listTyping.has(userId)) {
        clearTimeout(listTyping.get(userId));
        listTyping.delete(userId);
      }

      if (isTyping) {
        // Set timeout to auto-clear typing status after 3 seconds
        const timeout = setTimeout(() => {
          listTyping.delete(userId);
          socket.to(listId).emit('user:typing', { userId, listId, isTyping: false });
        }, 3000);
        listTyping.set(userId, timeout);
      }

      // Broadcast typing status to others in the list
      socket.to(listId).emit('user:typing', { userId, listId, isTyping });
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
      }
    }

    // Clear typing status
    if (typingUsers.has(listId) && typingUsers.get(listId)!.has(userId)) {
      clearTimeout(typingUsers.get(listId)!.get(userId));
      typingUsers.get(listId)!.delete(userId);
    }

    const users = Array.from(listUsers.get(listId) || []);
    console.log(`👤 User ${userId} left list ${listId}. Users: ${users.length}`);

    // Broadcast to others in the list
    socket.to(listId).emit('user:left', {
      userId,
      listId,
      userCount: users.length,
    });

    // Send presence update
    io.to(listId).emit('presence:update', { listId, users });

    socket.data.currentListId = null;
  }

  return io;
}
