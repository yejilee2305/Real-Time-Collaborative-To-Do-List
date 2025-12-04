import { create } from 'zustand';
import { TodoItem, TodoPriority, UpdateTodoDto, OnlineUser, ConflictError, PendingOperation } from '@sync/shared';
import { todoApi } from '../services/api';
import { socketService } from '../services/socket';
import { operationQueue } from '../services/operationQueue';

// Generate a unique user ID for this session (will be replaced with auth in Phase 3)
const generateUserId = () => {
  const stored = sessionStorage.getItem('sync-user-id');
  if (stored) return stored;
  const id = `user-${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem('sync-user-id', id);
  return id;
};

// Generate a user name (for now, from userId)
const generateUserName = (userId: string) => {
  const stored = sessionStorage.getItem('sync-user-name');
  if (stored) return stored;
  const name = `User ${userId.slice(5, 8).toUpperCase()}`;
  sessionStorage.setItem('sync-user-name', name);
  return name;
};

// Demo list ID - will be dynamic in later phases
const DEMO_LIST_ID = 'demo-list';

interface TodoState {
  todos: TodoItem[];
  currentListId: string;
  currentUserId: string;
  currentUserName: string;
  isLoading: boolean;
  error: string | null;

  // Real-time state
  isConnected: boolean;
  onlineUsers: OnlineUser[];
  typingUsers: OnlineUser[];
  userSelections: Map<string, string>; // userId -> todoId

  // Conflict resolution state
  pendingOperations: PendingOperation[];
  conflicts: ConflictError[];

  // Actions
  fetchTodos: (listId?: string) => Promise<void>;
  setTodos: (todos: TodoItem[]) => void;
  addTodo: (data: { title: string; priority?: TodoPriority }) => void;
  updateTodo: (id: string, updates: UpdateTodoDto) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  reorderTodo: (id: string, newPosition: number) => void;
  clearError: () => void;

  // Real-time actions
  setConnected: (connected: boolean) => void;
  setOnlineUsers: (users: OnlineUser[]) => void;
  sendTyping: (isTyping: boolean) => void;
  sendSelecting: (todoId: string | null) => void;
  initializeSocket: () => void;
  joinList: (listId: string) => void;

  // Conflict resolution actions
  resolveConflict: (todoId: string, resolution: 'accept-server' | 'retry') => void;
  dismissConflict: (todoId: string) => void;
  retryPendingOperations: () => void;

  // Helpers
  getUserColor: (userId: string) => string;
  getUserName: (userId: string) => string;
  getSelectingUsers: (todoId: string) => OnlineUser[];
  getTodoVersion: (todoId: string) => number | undefined;
}

export const useTodoStore = create<TodoState>((set, get) => {
  const userId = generateUserId();
  const userName = generateUserName(userId);

  return {
    todos: [],
    currentListId: DEMO_LIST_ID,
    currentUserId: userId,
    currentUserName: userName,
    isLoading: false,
    error: null,

    // Real-time state
    isConnected: false,
    onlineUsers: [],
    typingUsers: [],
    userSelections: new Map(),

    // Conflict resolution state
    pendingOperations: [],
    conflicts: [],

    initializeSocket: () => {
      const { currentListId, currentUserId, currentUserName } = get();

      // Set up socket event handlers
      socketService.onTodoCreated = (todo) => {
        set((state) => {
          // Check if todo already exists to prevent duplicates
          if (state.todos.some((t) => t.id === todo.id)) {
            return state;
          }
          return { todos: [...state.todos, todo] };
        });
      };

      socketService.onTodoUpdated = (todo) => {
        set((state) => ({
          todos: state.todos.map((t) => (t.id === todo.id ? todo : t)),
        }));
      };

      socketService.onTodoDeleted = ({ id }) => {
        set((state) => ({
          todos: state.todos.filter((t) => t.id !== id),
        }));
      };

      socketService.onTodoReordered = (todo) => {
        set((state) => ({
          todos: state.todos.map((t) => (t.id === todo.id ? todo : t)),
        }));
      };

      socketService.onTodoConflict = (conflict) => {
        console.warn('Conflict detected:', conflict);
        set((state) => ({
          conflicts: [...state.conflicts.filter((c) => c.todoId !== conflict.todoId), conflict],
        }));
        // Also update the todo with server data (server-wins by default for now)
        set((state) => ({
          todos: state.todos.map((t) =>
            t.id === conflict.todoId ? conflict.serverData : t
          ),
        }));
      };

      socketService.onPresenceUpdate = ({ users }) => {
        set({ onlineUsers: users });
      };

      socketService.onUserTyping = ({ userId, isTyping }) => {
        set((state) => {
          const user = state.onlineUsers.find((u) => u.userId === userId);
          if (!user) return state;

          if (isTyping && !state.typingUsers.some((u) => u.userId === userId)) {
            return { typingUsers: [...state.typingUsers, user] };
          } else if (!isTyping) {
            return { typingUsers: state.typingUsers.filter((u) => u.userId !== userId) };
          }
          return state;
        });
      };

      socketService.onUserSelecting = ({ userId, todoId }) => {
        set((state) => {
          const newSelections = new Map(state.userSelections);
          if (todoId) {
            newSelections.set(userId, todoId);
          } else {
            newSelections.delete(userId);
          }
          return { userSelections: newSelections };
        });
      };

      socketService.onConnectionChange = (connected) => {
        set({ isConnected: connected });
        operationQueue.setOnline(connected);
        if (connected) {
          socketService.joinList(currentListId, currentUserId, currentUserName);
        }
      };

      socketService.onError = ({ message }) => {
        set({ error: message });
      };

      socketService.onSyncAck = ({ operationId, success }) => {
        operationQueue.acknowledgeOperation(operationId, success);
      };

      // Set up operation queue handlers
      operationQueue.onOperationExecute = async (op: PendingOperation) => {
        const { currentUserId } = get();
        switch (op.type) {
          case 'create':
            socketService.createTodo({
              ...(op.payload as { listId: string; title: string; priority?: TodoPriority }),
              createdBy: currentUserId,
              operationId: op.id,
            });
            break;
          case 'update': {
            const updatePayload = op.payload as { id: string; updates: UpdateTodoDto };
            socketService.updateTodo(
              updatePayload.id,
              updatePayload.updates,
              op.version,
              currentUserId,
              op.id
            );
            break;
          }
          case 'delete':
            socketService.deleteTodo(op.todoId!, op.listId, op.version, op.id);
            break;
          case 'reorder': {
            const reorderPayload = op.payload as { id: string; newPosition: number };
            socketService.reorderTodo(
              reorderPayload.id,
              reorderPayload.newPosition,
              op.listId,
              currentUserId,
              op.id
            );
            break;
          }
        }
      };

      operationQueue.onConflict = (conflict) => {
        operationQueue.handleConflict(conflict);
      };

      operationQueue.onQueueChange = (queue) => {
        set({ pendingOperations: queue });
      };

      // Connect and join list
      socketService.connect();
    },

    fetchTodos: async (listId?: string) => {
      const targetListId = listId || get().currentListId;
      set({ isLoading: true, error: null });

      try {
        const todos = await todoApi.getByListId(targetListId);
        set({ todos, currentListId: targetListId, isLoading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch todos',
          isLoading: false,
        });
      }
    },

    setTodos: (todos) => set({ todos }),

    addTodo: (data) => {
      const { currentListId, currentUserId, isConnected } = get();

      const payload = {
        listId: currentListId,
        title: data.title,
        priority: data.priority || 'medium',
      };

      if (isConnected) {
        // Send directly via socket
        socketService.createTodo({
          ...payload,
          createdBy: currentUserId,
        });
      } else {
        // Queue for later
        operationQueue.enqueue('create', currentListId, payload);
      }
    },

    updateTodo: (id, updates) => {
      const { todos, currentListId, currentUserId, isConnected } = get();
      const todo = todos.find((t) => t.id === id);
      if (!todo) return;

      // Optimistic update - convert null to undefined for compatibility
      const sanitizedUpdates = Object.fromEntries(
        Object.entries(updates).map(([key, value]) => [key, value === null ? undefined : value])
      );
      set({
        todos: todos.map((t) =>
          t.id === id ? { ...t, ...sanitizedUpdates, version: (t.version || 1) + 1 } : t
        ) as TodoItem[],
      });

      if (isConnected) {
        // Send via socket with version for conflict detection
        socketService.updateTodo(id, updates, todo.version, currentUserId);
      } else {
        // Queue for later
        operationQueue.enqueue('update', currentListId, { id, updates }, id, todo.version);
      }
    },

    toggleTodo: (id) => {
      const { todos, currentListId, currentUserId, isConnected } = get();
      const todo = todos.find((t) => t.id === id);
      if (!todo) return;

      const updates = { completed: !todo.completed };

      // Optimistic update
      set({
        todos: todos.map((t) =>
          t.id === id ? { ...t, completed: !t.completed, version: (t.version || 1) + 1 } : t
        ),
      });

      if (isConnected) {
        socketService.updateTodo(id, updates, todo.version, currentUserId);
      } else {
        operationQueue.enqueue('update', currentListId, { id, updates }, id, todo.version);
      }
    },

    deleteTodo: (id) => {
      const { todos, currentListId, isConnected } = get();
      const todo = todos.find((t) => t.id === id);
      if (!todo) return;

      // Optimistic update
      set({
        todos: todos.filter((t) => t.id !== id),
      });

      if (isConnected) {
        socketService.deleteTodo(id, currentListId, todo.version);
      } else {
        operationQueue.enqueue('delete', currentListId, {}, id, todo.version);
      }
    },

    reorderTodo: (id, newPosition) => {
      const { todos, currentListId, currentUserId, isConnected } = get();
      const todoIndex = todos.findIndex((t) => t.id === id);
      if (todoIndex === -1) return;

      // Optimistic reorder
      const newTodos = [...todos];
      const [movedTodo] = newTodos.splice(todoIndex, 1);
      newTodos.splice(newPosition, 0, movedTodo);
      set({ todos: newTodos });

      if (isConnected) {
        socketService.reorderTodo(id, newPosition, currentListId, currentUserId);
      } else {
        operationQueue.enqueue('reorder', currentListId, { id, newPosition }, id);
      }
    },

    clearError: () => set({ error: null }),

    // Real-time actions
    setConnected: (connected) => set({ isConnected: connected }),
    setOnlineUsers: (users) => set({ onlineUsers: users }),

    sendTyping: (isTyping) => {
      const { currentListId, currentUserId } = get();
      socketService.sendTyping(currentListId, currentUserId, isTyping);
    },

    sendSelecting: (todoId) => {
      const { currentListId, currentUserId } = get();
      socketService.sendSelecting(currentListId, currentUserId, todoId);
    },

    joinList: (listId) => {
      const { currentUserId, currentUserName, currentListId } = get();

      // Leave current list if different
      if (currentListId && currentListId !== listId) {
        socketService.leaveList(currentListId, currentUserId);
      }

      // Update state and join new list
      set({
        currentListId: listId,
        todos: [],
        onlineUsers: [],
        typingUsers: [],
        userSelections: new Map(),
        conflicts: [],
      });

      socketService.joinList(listId, currentUserId, currentUserName);
    },

    // Conflict resolution actions
    resolveConflict: (todoId, resolution) => {
      const { conflicts, todos } = get();
      const conflict = conflicts.find((c) => c.todoId === todoId);
      if (!conflict) return;

      if (resolution === 'accept-server') {
        // Update with server data
        set({
          todos: todos.map((t) => (t.id === todoId ? conflict.serverData : t)),
          conflicts: conflicts.filter((c) => c.todoId !== todoId),
        });
      } else if (resolution === 'retry') {
        // Retry the operation with the new version
        operationQueue.retryFailed();
        set({
          conflicts: conflicts.filter((c) => c.todoId !== todoId),
        });
      }
    },

    dismissConflict: (todoId) => {
      set((state) => ({
        conflicts: state.conflicts.filter((c) => c.todoId !== todoId),
      }));
    },

    retryPendingOperations: () => {
      operationQueue.retryFailed();
    },

    // Helper functions
    getUserColor: (userId) => {
      const { onlineUsers } = get();
      const user = onlineUsers.find((u) => u.userId === userId);
      return user?.color || '#6B7280'; // gray default
    },

    getUserName: (userId) => {
      const { onlineUsers, currentUserId, currentUserName } = get();
      if (userId === currentUserId) return currentUserName;
      const user = onlineUsers.find((u) => u.userId === userId);
      return user?.name || userId.slice(5, 12);
    },

    getSelectingUsers: (todoId) => {
      const { onlineUsers, userSelections, currentUserId } = get();
      return onlineUsers.filter(
        (u) => u.userId !== currentUserId && userSelections.get(u.userId) === todoId
      );
    },

    getTodoVersion: (todoId) => {
      const { todos } = get();
      return todos.find((t) => t.id === todoId)?.version;
    },
  };
});
