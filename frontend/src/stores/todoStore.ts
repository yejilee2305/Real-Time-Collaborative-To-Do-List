import { create } from 'zustand';
import { TodoItem, TodoPriority, UpdateTodoDto } from '@sync/shared';
import { todoApi } from '../services/api';

// Demo values - will be replaced with auth in Phase 2
const DEMO_LIST_ID = 'demo-list';
const DEMO_USER_ID = 'demo-user';

interface TodoState {
  todos: TodoItem[];
  currentListId: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTodos: (listId?: string) => Promise<void>;
  addTodo: (data: { title: string; priority?: TodoPriority }) => Promise<void>;
  updateTodo: (id: string, updates: UpdateTodoDto) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  reorderTodo: (id: string, newPosition: number) => Promise<void>;
  clearError: () => void;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  currentListId: DEMO_LIST_ID,
  isLoading: false,
  error: null,

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

  addTodo: async (data) => {
    const { currentListId, todos } = get();
    set({ isLoading: true, error: null });

    try {
      const newTodo = await todoApi.create({
        listId: currentListId,
        title: data.title,
        priority: data.priority || 'medium',
        createdBy: DEMO_USER_ID,
      });
      set({ todos: [...todos, newTodo], isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add todo',
        isLoading: false,
      });
    }
  },

  updateTodo: async (id, updates) => {
    const { todos } = get();

    // Optimistic update - convert null to undefined for compatibility
    const sanitizedUpdates = Object.fromEntries(
      Object.entries(updates).map(([key, value]) => [key, value === null ? undefined : value])
    );
    set({
      todos: todos.map((t) => (t.id === id ? { ...t, ...sanitizedUpdates } : t)) as TodoItem[],
    });

    try {
      const updatedTodo = await todoApi.update(id, updates);
      set({
        todos: todos.map((t) => (t.id === id ? updatedTodo : t)),
      });
    } catch (error) {
      // Rollback on error
      set({
        todos,
        error: error instanceof Error ? error.message : 'Failed to update todo',
      });
    }
  },

  toggleTodo: async (id) => {
    const { todos } = get();
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    // Optimistic update
    set({
      todos: todos.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ),
    });

    try {
      const updatedTodo = await todoApi.toggle(id);
      set({
        todos: todos.map((t) => (t.id === id ? updatedTodo : t)),
      });
    } catch (error) {
      // Rollback on error
      set({
        todos,
        error: error instanceof Error ? error.message : 'Failed to toggle todo',
      });
    }
  },

  deleteTodo: async (id) => {
    const { todos } = get();

    // Optimistic update
    set({
      todos: todos.filter((t) => t.id !== id),
    });

    try {
      await todoApi.delete(id);
    } catch (error) {
      // Rollback on error
      set({
        todos,
        error: error instanceof Error ? error.message : 'Failed to delete todo',
      });
    }
  },

  reorderTodo: async (id, newPosition) => {
    const { todos } = get();
    const todoIndex = todos.findIndex((t) => t.id === id);
    if (todoIndex === -1) return;

    // Optimistic reorder
    const newTodos = [...todos];
    const [movedTodo] = newTodos.splice(todoIndex, 1);
    newTodos.splice(newPosition, 0, movedTodo);
    set({ todos: newTodos });

    try {
      await todoApi.reorder(id, newPosition);
    } catch (error) {
      // Rollback on error
      set({
        todos,
        error: error instanceof Error ? error.message : 'Failed to reorder todo',
      });
    }
  },

  clearError: () => set({ error: null }),
}));
