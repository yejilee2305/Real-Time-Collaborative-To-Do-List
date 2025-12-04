import { Request, Response, NextFunction } from 'express';
import { ApiResponse, User, CreateUserDto } from '@sync/shared';
import * as usersService from '../services/users';
import { AppError } from '../middleware/errorHandler';

export async function getUserById(
  req: Request,
  res: Response<ApiResponse<User>>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const user = await usersService.getUserById(id);

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function createUser(
  req: Request,
  res: Response<ApiResponse<User>>,
  next: NextFunction
): Promise<void> {
  try {
    const userData: CreateUserDto = req.body;
    const user = await usersService.createUser(userData);

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(
  req: Request,
  res: Response<ApiResponse<User>>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const updates: Partial<CreateUserDto> = req.body;

    const user = await usersService.updateUser(id, updates);

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function findOrCreateUser(
  req: Request,
  res: Response<ApiResponse<User>>,
  next: NextFunction
): Promise<void> {
  try {
    const userData: CreateUserDto = req.body;
    const user = await usersService.findOrCreateUser(userData);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}
