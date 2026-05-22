import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ApiResponse } from '../types';

export function validateRequest(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const list = errors.array();
    const firstMsg = (list[0] as any)?.msg;
    const field = (list[0] as any)?.path || (list[0] as any)?.param;
    const message = firstMsg && firstMsg !== 'Invalid value'
      ? firstMsg
      : field ? `Invalid value for field: ${field}` : 'Validation failed';
    res.status(400).json({
      success: false,
      error: message,
      details: list,
    } as ApiResponse);
    return;
  }
  next();
}
