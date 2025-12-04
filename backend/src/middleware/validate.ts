import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ApiResponse } from '@sync/shared';

export function validate(
  req: Request,
  res: Response<ApiResponse<null>>,
  next: NextFunction
): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => {
      if ('path' in err) {
        return `${err.path}: ${err.msg}`;
      }
      return err.msg;
    });

    res.status(400).json({
      success: false,
      error: errorMessages.join(', '),
    });
    return;
  }

  next();
}
