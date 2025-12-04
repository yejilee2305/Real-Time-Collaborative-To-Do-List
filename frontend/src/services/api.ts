import {
  ApiResponse,
  TodoItem,
  CreateTodoDto,
  UpdateTodoDto,
  TodoList,
  CreateListDto,
} from '@sync/shared';

const API_BASE = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  const data: ApiResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'An error occurred');
  }

  return data.data as T;
}

// Todo API
export const todoApi = {
  async getByListId(listId: string): Promise<TodoItem[]> {
    const response = await fetch(`${API_BASE}/todos?listId=${listId}`);
    return handleResponse<TodoItem[]>(response);
  },

  async create(
    data: Omit<CreateTodoDto, 'listId'> & { listId: string; createdBy: string }
  ): Promise<TodoItem> {
    const response = await fetch(`${API_BASE}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<TodoItem>(response);
  },

  async update(id: string, data: UpdateTodoDto): Promise<TodoItem> {
    const response = await fetch(`${API_BASE}/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<TodoItem>(response);
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/todos/${id}`, {
      method: 'DELETE',
    });
    await handleResponse<{ id: string }>(response);
  },

  async toggle(id: string): Promise<TodoItem> {
    const response = await fetch(`${API_BASE}/todos/${id}/toggle`, {
      method: 'PATCH',
    });
    return handleResponse<TodoItem>(response);
  },

  async reorder(id: string, position: number): Promise<TodoItem> {
    const response = await fetch(`${API_BASE}/todos/${id}/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position }),
    });
    return handleResponse<TodoItem>(response);
  },
};

// List API
export const listApi = {
  async getAll(): Promise<TodoList[]> {
    const response = await fetch(`${API_BASE}/lists`);
    return handleResponse<TodoList[]>(response);
  },

  async getById(id: string): Promise<TodoList> {
    const response = await fetch(`${API_BASE}/lists/${id}`);
    return handleResponse<TodoList>(response);
  },

  async create(data: CreateListDto & { ownerId: string }): Promise<TodoList> {
    const response = await fetch(`${API_BASE}/lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<TodoList>(response);
  },

  async getByUserId(userId: string): Promise<TodoList[]> {
    const response = await fetch(`${API_BASE}/lists/user/${userId}`);
    return handleResponse<TodoList[]>(response);
  },
};
