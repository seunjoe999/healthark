import { classifyActorSource, formatRoleLabel, sanitizeAuditSnapshot } from '../routes/auditTrail.routes';

describe('Client Video Fixes — Audit Trail Classification & Sanitization', () => {
  test('classifies management/office roles distinctly from care floor staff', () => {
    expect(classifyActorSource('super_admin')).toBe('office');
    expect(classifyActorSource('group_admin')).toBe('office');
    expect(classifyActorSource('home_manager')).toBe('office');
    expect(classifyActorSource('deputy_manager')).toBe('office');
    expect(classifyActorSource('care_staff')).toBe('staff');
    expect(classifyActorSource('senior_carer')).toBe('staff');
    expect(classifyActorSource('team_leader')).toBe('staff');
  });

  test('formats role labels cleanly without underscores', () => {
    expect(formatRoleLabel('home_manager')).toBe('Home Manager');
    expect(formatRoleLabel('care_staff')).toBe('Care Staff');
    expect(formatRoleLabel('super_admin')).toBe('Super Admin');
  });

  test('sanitizes sensitive credentials and data-URI signatures from audit snapshots', () => {
    const snap = sanitizeAuditSnapshot({
      id: 'abc-123',
      password_hash: 'secret_hash',
      pin_hash: 'pin_hash',
      signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANS',
      summary: 'Updated monthly review summary',
      outcomes: 'Follow up with GP next Tuesday',
    });

    expect(snap).not.toHaveProperty('id');
    expect(snap).not.toHaveProperty('password_hash');
    expect(snap).not.toHaveProperty('pin_hash');
    expect(snap).not.toHaveProperty('signature_data');
    expect(snap).toEqual({
      summary: 'Updated monthly review summary',
      outcomes: 'Follow up with GP next Tuesday',
    });
  });
});
