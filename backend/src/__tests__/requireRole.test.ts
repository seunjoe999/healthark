import { requireRole } from '../middleware/auth';
import { Request, Response } from 'express';

// Regression coverage for the security gaps found and fixed in this session —
// shifts.routes.ts, invoicing.routes.ts, notifications.routes.ts and others
// had NO role check at all on write endpoints. requireRole is the single
// gate all of those fixes rely on, so it's worth pinning its behaviour down.

function mockReqRes(role?: string) {
  const req = { staff: role ? { role } : undefined } as unknown as Request;
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status } as unknown as Response;
  const next = jest.fn();
  return { req, res, status, json, next };
}

describe('requireRole', () => {
  it('rejects with 401 when no staff is attached to the request (not authenticated)', () => {
    const { req, res, status, next } = mockReqRes(undefined);
    requireRole('home_manager')(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects with 403 when the role is not in the allowed list', () => {
    const { req, res, status, next } = mockReqRes('care_staff' as any);
    requireRole('home_manager', 'group_admin')(req, res, next);
    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows through when the role is in the allowed list', () => {
    const { req, res, status, next } = mockReqRes('home_manager' as any);
    requireRole('home_manager', 'group_admin')(req, res, next);
    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('always allows super_admin through, even if not in the explicit list', () => {
    const { req, res, status, next } = mockReqRes('super_admin' as any);
    requireRole('home_manager')(req, res, next);
    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
