import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { logger } from '../config/logger';

// Middleware to write to immutable audit_log after every mutating request
export function auditLog(action: string, tableName?: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      // Only log successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300 && req.staff) {
        const recordId = (body as Record<string, Record<string, string>>)?.data?.id || req.params.id;
        query(
          `INSERT INTO audit_log (staff_id, home_id, action, table_name, record_id, new_values, ip_address, session_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            req.staff.staffId,
            req.staff.homeId,
            action,
            tableName || null,
            recordId || null,
            JSON.stringify(req.body),
            req.ip,
            req.headers['x-session-id'] || null,
          ]
        ).catch((err) => logger.error('Audit log write failed', { err }));
      }
      return originalJson(body);
    };

    next();
  };
}
