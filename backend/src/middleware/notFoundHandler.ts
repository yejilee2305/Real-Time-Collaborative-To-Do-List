import { Request, Response } from 'express';
import { ApiResponse } from '@sync/shared';

export function notFoundHandler(
  req: Request,
  res: Response<ApiResponse<null>>
): void {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
}
