import { create } from 'zustand';
import { TodoItem, TodoPriority, UpdateTodoDto, OnlineUser } from '@sync/shared';
import { todoApi } from '../services/api';
import { socketService } from '../services/socket';

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

  // Helpers
  getUserColor: (userId: string) => string;
  getUserName: (userId: string) => string;
  getSelectingUsers: (todoId: string) => OnlineUser[];
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
        if (connected) {
          socketService.joinList(currentListId, currentUserId, currentUserName);
        }
      };

      socketService.onError = ({ message }) => {
        set({ error: message });
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
      const { currentListId, currentUserId } = get();

      // Send via socket - the server will broadcast to all clients including sender
      socketService.createTodo({
        listId: currentListId,
        title: data.title,
        priority: data.priority || 'medium',
        createdBy: currentUserId,
      });
    },

    updateTodo: (id, updates) => {
      const { todos } = get();

      // Optimistic update - convert null to undefined for compatibility
      const sanitizedUpdates = Object.fromEntries(
        Object.entries(updates).map(([key, value]) => [
          key,
          value === null ? undefined : value,
        ])
      );
      set({
        todos: todos.map((t) =>
          t.id === id ? { ...t, ...sanitizedUpdates } : t
        ) as TodoItem[],
      });

      // Send via socket
      socketService.updateTodo(id, updates);
    },

    toggleTodo: (id) => {
      const { todos } = get();
      const todo = todos.find((t) => t.id === id);
      if (!todo) return;

      // Optimistic update
      set({
        todos: todos.map((t) =>
          t.id === id ? { ...t, completed: !t.completed } : t
        ),
      });

      // Send via socket
      socketService.updateTodo(id, { completed: !todo.completed });
    },

    deleteTodo: (id) => {
      const { todos, currentListId } = get();

      // Optimistic update
      set({
        todos: todos.filter((t) => t.id !== id),
      });

      // Send via socket
      socketService.deleteTodo(id, currentListId);
    },

    reorderTodo: (id, newPosition) => {
      const { todos, currentListId } = get();
      const todoIndex = todos.findIndex((t) => t.id === id);
      if (todoIndex === -1) return;

      // Optimistic reorder
      const newTodos = [...todos];
      const [movedTodo] = newTodos.splice(todoIndex, 1);
      newTodos.splice(newPosition, 0, movedTodo);
      set({ todos: newTodos });

      // Send via socket
      socketService.reorderTodo(id, newPosition, currentListId);
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
      });

      socketService.joinList(listId, currentUserId, currentUserName);
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
  };
});
