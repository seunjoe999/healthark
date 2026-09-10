import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Regression coverage for a real patient-safety bug found in this session:
// is_controlled was collected on the Add/Edit Medication form but never
// written to the database on either create or edit, so the controlled-drug
// witness sign-off requirement silently never triggered.

process.env.JWT_SECRET = 'test-secret';

const queryMock = jest.fn(async (sql: string, _params?: unknown[]) => {
  if (sql.includes('FROM staff WHERE id')) {
    return [{ is_active: true, status: 'active', organisation_id: 'org-1' }];
  }
  if (sql.startsWith('INSERT INTO su_medications')) {
    return [{ id: 'med-1' }];
  }
  if (sql.startsWith('UPDATE su_medications')) {
    return [{ id: 'med-1' }];
  }
  return [];
});

jest.mock('../config/database', () => ({ query: (sql: string, params?: unknown[]) => queryMock(sql, params) }));

import marRouter from '../routes/mar.routes';

function tokenFor(role: string) {
  return jwt.sign({ staffId: 'staff-1', role, homeId: 'home-1', organisationId: 'org-1' }, process.env.JWT_SECRET!);
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/mar', marRouter);
  app.use((err: any, _req: any, res: any, _next: any) => res.status(500).json({ success: false, error: err.message }));
  return app;
}

describe('MAR medications — is_controlled persistence', () => {
  const app = buildApp();

  it('includes isControlled=true in the INSERT when creating a medication', async () => {
    const res = await request(app)
      .post('/api/mar/medications')
      .set('Authorization', `Bearer ${tokenFor('home_manager')}`)
      .send({ suId: '11111111-1111-4111-8111-111111111111', medicationName: 'Morphine', isControlled: true });
    expect(res.status).toBeLessThan(400);

    const insertCall = queryMock.mock.calls.find(c => String(c[0]).startsWith('INSERT INTO su_medications'));
    expect(insertCall).toBeDefined();
    expect(insertCall![0]).toEqual(expect.stringContaining('is_controlled'));
    expect(insertCall![1]).toEqual(expect.arrayContaining([true]));
  });

  it('includes is_controlled in the UPDATE when editing a medication', async () => {
    const res = await request(app)
      .patch('/api/mar/medications/22222222-2222-4222-8222-222222222222')
      .set('Authorization', `Bearer ${tokenFor('home_manager')}`)
      .send({ isControlled: true });
    expect(res.status).toBeLessThan(400);

    const updateCall = queryMock.mock.calls.find(c => String(c[0]).startsWith('UPDATE su_medications'));
    expect(updateCall).toBeDefined();
    expect(updateCall![0]).toEqual(expect.stringContaining('is_controlled'));
  });
});
