import { create } from 'zustand';
import { TodoItem, TodoPriority, UpdateTodoDto } from '@sync/shared';
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

// Demo list ID - will be dynamic in later phases
const DEMO_LIST_ID = 'demo-list';

interface TodoState {
  todos: TodoItem[];
  currentListId: string;
  currentUserId: string;
  isLoading: boolean;
  error: string | null;

  // Real-time state
  isConnected: boolean;
  onlineUsers: string[];
  typingUsers: string[];

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
  setOnlineUsers: (users: string[]) => void;
  setTypingUsers: (users: string[]) => void;
  addTypingUser: (userId: string) => void;
  removeTypingUser: (userId: string) => void;
  sendTyping: (isTyping: boolean) => void;
  initializeSocket: () => void;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  currentListId: DEMO_LIST_ID,
  currentUserId: generateUserId(),
  isLoading: false,
  error: null,

  // Real-time state
  isConnected: false,
  onlineUsers: [],
  typingUsers: [],

  initializeSocket: () => {
    const { currentListId, currentUserId } = get();

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
        if (isTyping && !state.typingUsers.includes(userId)) {
          return { typingUsers: [...state.typingUsers, userId] };
        } else if (!isTyping) {
          return { typingUsers: state.typingUsers.filter((u) => u !== userId) };
        }
        return state;
      });
    };

    socketService.onConnectionChange = (connected) => {
      set({ isConnected: connected });
      if (connected) {
        socketService.joinList(currentListId, currentUserId);
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
  setTypingUsers: (users) => set({ typingUsers: users }),

  addTypingUser: (userId) =>
    set((state) => {
      if (state.typingUsers.includes(userId)) return state;
      return { typingUsers: [...state.typingUsers, userId] };
    }),

  removeTypingUser: (userId) =>
    set((state) => ({
      typingUsers: state.typingUsers.filter((u) => u !== userId),
    })),

  sendTyping: (isTyping) => {
    const { currentListId, currentUserId } = get();
    socketService.sendTyping(currentListId, currentUserId, isTyping);
  },
}));
