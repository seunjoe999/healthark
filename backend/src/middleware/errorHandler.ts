import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { logger } from '../config/logger';
import { ApiResponse } from '../types';
import { query } from '../config/database';

// Keep a record of every server-side failure (not ordinary "not allowed" /
// validation refusals) for the System Health page. Never allowed to throw.
function recordError(req: Request, statusCode: number, message: string): void {
  try {
    query(
      'INSERT INTO error_log (method, path, status_code, message, staff_id) VALUES ($1,$2,$3,$4,$5)',
      [req.method, String(req.originalUrl || req.path).split('?')[0].slice(0, 300), statusCode, String(message || '').slice(0, 1000), req.staff?.staffId || null]
    ).catch(() => {});
  } catch { /* ignore */ }
}

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    staffId: req.staff?.staffId,
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    } as ApiResponse);
    return;
  }

  // Multer upload errors (file too large, too many files, etc.) were falling
  // through to the generic 500 below — a large zip (or any file over the
  // route's size limit) looked identical to "upload broken" with no
  // indication it was actually a size problem.
  if (err instanceof multer.MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: 'File is too large for this upload.',
      LIMIT_FILE_COUNT: 'Too many files selected.',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field.',
    };
    res.status(400).json({
      success: false,
      error: messages[err.code] || `Upload error: ${err.message}`,
    } as ApiResponse);
    return;
  }

  // PostgreSQL unique violation
  if ((err as NodeJS.ErrnoException).code === '23505') {
    res.status(409).json({ success: false, error: 'Record already exists' } as ApiResponse);
    return;
  }

  // PostgreSQL foreign key violation
  if ((err as NodeJS.ErrnoException).code === '23503') {
    res.status(400).json({ success: false, error: 'Referenced record does not exist' } as ApiResponse);
    return;
  }

  // PostgreSQL data errors (class 22 = bad value, 23 = constraint). These are
  // "this value can't be saved" problems, not server faults — reporting them
  // as a bare "Internal server error" left staff and the owner with no way to
  // tell what was wrong with a form. Say which field/what kind of problem.
  const pgCode = String((err as any).code || '');
  if (/^(22|23)[0-9A-Z]{3}$/.test(pgCode)) {
    const col = (err as any).column ? ` (${String((err as any).column).replace(/_/g, ' ')})` : '';
    const friendly: Record<string, string> = {
      '22001': 'One of the values is too long for its field',
      '22P02': 'One of the values is in the wrong format',
      '22007': 'A date or time is in the wrong format',
      '22008': 'A date or time is out of range',
      '22003': 'A number is out of range',
      '23502': `A required value is missing${col}`,
      '23514': 'One of the values is not an allowed option',
    };
    recordError(req, 400, err.message);
    res.status(400).json({
      success: false,
      error: `Could not save — ${friendly[pgCode] || 'one of the values was rejected'}. [${err.message}]`,
    } as ApiResponse);
    return;
  }

  // Any other database error (missing column, bad query...). Still a server
  // fault, but the bare "Internal server error" made repeated reports of the
  // same broken form impossible to diagnose from a screenshot — include the
  // database's own one-line reason so the cause is visible straight away.
  if (/^[0-9A-Z]{5}$/.test(pgCode) && (err as any).severity) {
    recordError(req, 500, `${err.message} [${pgCode}]`);
    res.status(500).json({
      success: false,
      error: `Server error — ${err.message} [${pgCode}]`,
    } as ApiResponse);
    return;
  }

  // Default 500 — only expose error detail in development; hide internals in production
  const isProd = process.env.NODE_ENV === 'production';
  recordError(req, 500, err.message);
  res.status(500).json({
    success: false,
    error: isProd ? 'Internal server error' : (err.message || 'Internal server error'),
  } as ApiResponse);
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ success: false, error: `Route ${req.path} not found` } as ApiResponse);
}
