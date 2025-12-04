import { Request, Response, NextFunction } from 'express';
import { ApiResponse, TodoList, CreateListDto, UpdateListDto } from '@sync/shared';
import * as listsService from '../services/lists';
import { AppError } from '../middleware/errorHandler';

export async function getLists(
  _req: Request,
  res: Response<ApiResponse<TodoList[]>>,
  next: NextFunction
): Promise<void> {
  try {
    const lists = await listsService.getAllLists();

    res.json({
      success: true,
      data: lists,
    });
  } catch (error) {
    next(error);
  }
}

export async function getListById(
  req: Request,
  res: Response<ApiResponse<TodoList>>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const list = await listsService.getListById(id);

    if (!list) {
      throw new AppError(404, 'List not found');
    }

    res.json({
      success: true,
      data: list,
    });
  } catch (error) {
    next(error);
  }
}

export async function createList(
  req: Request,
  res: Response<ApiResponse<TodoList>>,
  next: NextFunction
): Promise<void> {
  try {
    const listData: CreateListDto & { ownerId: string } = req.body;
    const list = await listsService.createList(listData, listData.ownerId);

    res.status(201).json({
      success: true,
      data: list,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateList(
  req: Request,
  res: Response<ApiResponse<TodoList>>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const updates: UpdateListDto = req.body;

    const list = await listsService.updateList(id, updates);

    if (!list) {
      throw new AppError(404, 'List not found');
    }

    res.json({
      success: true,
      data: list,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteList(
  req: Request,
  res: Response<ApiResponse<{ id: string }>>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await listsService.deleteList(id);

    if (!deleted) {
      throw new AppError(404, 'List not found');
    }

    res.json({
      success: true,
      data: { id },
      message: 'List deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function getListsByUser(
  req: Request,
  res: Response<ApiResponse<TodoList[]>>,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = req.params;
    const lists = await listsService.getListsByUserId(userId);

    res.json({
      success: true,
      data: lists,
    });
  } catch (error) {
    next(error);
  }
}
