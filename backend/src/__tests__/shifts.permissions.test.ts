import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Regression coverage for the most serious finding of this session's audit:
// shifts.routes.ts had NO role check on any write endpoint, so any
// authenticated staff member (including care_staff) could create, edit, or
// delete any shift directly via the API regardless of what the UI showed
// them. This pins down that POST/PUT/DELETE now correctly require a
// management-tier role, while GET stays open to any authenticated staff.

process.env.JWT_SECRET = 'test-secret';

jest.mock('../config/database', () => ({
  query: jest.fn(async (sql: string) => {
    // authenticate() looks up the caller's staff row to confirm they're active
    if (sql.includes('FROM staff WHERE id')) {
      return [{ is_active: true, status: 'active', organisation_id: 'org-1' }];
    }
    // Any shift-table read/write in these tests can return an empty/ok result —
    // we're only asserting whether the request is authorized to reach the
    // handler at all, not exercising the shift-creation logic itself.
    return [];
  }),
}));

import shiftsRouter from '../routes/shifts.routes';

function tokenFor(role: string) {
  return jwt.sign({ staffId: 'staff-1', role, homeId: 'home-1', organisationId: 'org-1' }, process.env.JWT_SECRET!);
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/shifts', shiftsRouter);
  // minimal error handler so a thrown/next(err) doesn't hang the test
  app.use((err: any, _req: any, res: any, _next: any) => res.status(500).json({ success: false, error: err.message }));
  return app;
}

describe('shifts.routes.ts authorization', () => {
  const app = buildApp();

  it('rejects unauthenticated requests to create a shift', async () => {
    const res = await request(app).post('/api/shifts').send({});
    expect(res.status).toBe(401);
  });

  it('rejects care_staff creating a shift', async () => {
    const res = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${tokenFor('care_staff')}`)
      .send({ staffId: 'x', shiftDate: '2026-01-01', startTime: '08:00', endTime: '20:00' });
    expect(res.status).toBe(403);
  });

  it('allows home_manager to create a shift', async () => {
    const res = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${tokenFor('home_manager')}`)
      .send({ staffId: 'x', shiftDate: '2026-01-01', startTime: '08:00', endTime: '20:00' });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('rejects care_staff deleting a shift template', async () => {
    const res = await request(app)
      .delete('/api/shifts/templates/some-id')
      .set('Authorization', `Bearer ${tokenFor('care_staff')}`);
    expect(res.status).toBe(403);
  });

  it('rejects care_staff approving a shift swap', async () => {
    const res = await request(app)
      .put('/api/shifts/swaps/some-id')
      .set('Authorization', `Bearer ${tokenFor('care_staff')}`)
      .send({ status: 'approved' });
    expect(res.status).toBe(403);
  });

  it('allows any authenticated staff to read the shift list', async () => {
    const res = await request(app)
      .get('/api/shifts')
      .set('Authorization', `Bearer ${tokenFor('care_staff')}`);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
