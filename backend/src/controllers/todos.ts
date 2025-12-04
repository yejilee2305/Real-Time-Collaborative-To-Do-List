import { Request, Response, NextFunction } from 'express';
import { ApiResponse, TodoItem, CreateTodoDto, UpdateTodoDto } from '@sync/shared';
import * as todosService from '../services/todos';
import { AppError } from '../middleware/errorHandler';

export async function getTodos(
  req: Request,
  res: Response<ApiResponse<TodoItem[]>>,
  next: NextFunction
): Promise<void> {
  try {
    const { listId } = req.query;
    const todos = await todosService.getTodosByListId(listId as string);

    res.json({
      success: true,
      data: todos,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTodoById(
  req: Request,
  res: Response<ApiResponse<TodoItem>>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const todo = await todosService.getTodoById(id);

    if (!todo) {
      throw new AppError(404, 'Todo not found');
    }

    res.json({
      success: true,
      data: todo,
    });
  } catch (error) {
    next(error);
  }
}

export async function createTodo(
  req: Request,
  res: Response<ApiResponse<TodoItem>>,
  next: NextFunction
): Promise<void> {
  try {
    const todoData: CreateTodoDto = req.body;
    // For now, use a hardcoded user ID. Will be replaced with auth in Phase 2
    const createdBy = req.body.createdBy || '00000000-0000-0000-0000-000000000000';

    const todo = await todosService.createTodo(todoData, createdBy);

    res.status(201).json({
      success: true,
      data: todo,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTodo(
  req: Request,
  res: Response<ApiResponse<TodoItem>>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const updates: UpdateTodoDto = req.body;
    const version = req.body.version as number | undefined;
    const editedBy = req.body.editedBy as string | undefined;

    const result = await todosService.updateTodo(id, updates, version, editedBy);

    if (!result.success && result.conflict) {
      res.status(409).json({
        success: false,
        error: result.conflict.message,
      });
      return;
    }

    if (!result.todo) {
      throw new AppError(404, 'Todo not found');
    }

    res.json({
      success: true,
      data: result.todo,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteTodo(
  req: Request,
  res: Response<ApiResponse<{ id: string }>>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await todosService.deleteTodo(id);

    if (!deleted) {
      throw new AppError(404, 'Todo not found');
    }

    res.json({
      success: true,
      data: { id },
      message: 'Todo deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleTodo(
  req: Request,
  res: Response<ApiResponse<TodoItem>>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const todo = await todosService.toggleTodo(id);

    if (!todo) {
      throw new AppError(404, 'Todo not found');
    }

    res.json({
      success: true,
      data: todo,
    });
  } catch (error) {
    next(error);
  }
}

export async function reorderTodo(
  req: Request,
  res: Response<ApiResponse<TodoItem>>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { position } = req.body;

    const todo = await todosService.reorderTodo(id, position);

    if (!todo) {
      throw new AppError(404, 'Todo not found');
    }

    res.json({
      success: true,
      data: todo,
    });
  } catch (error) {
    next(error);
  }
}
