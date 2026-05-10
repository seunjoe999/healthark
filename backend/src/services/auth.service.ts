import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, transaction } from '../config/database';
import { JwtPayload, StaffRole } from '../types';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

const BCRYPT_ROUNDS = 12;

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  staff: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: StaffRole;
    homeId: string | null;
    organisationId: string;
    photoUrl: string | null;
  };
}

export class AuthService {
  // ── Login ───────────────────────────────────────────────────────
  async login(email: string, password: string, ipAddress?: string): Promise<LoginResult> {
    const rows = await query<{
      id: string; email: string; password_hash: string; first_name: string;
      last_name: string; role: StaffRole; home_id: string | null;
      organisation_id: string; status: string; is_active: boolean;
      photo_url: string | null;
    }>(
      `SELECT id, email, password_hash, first_name, last_name, role,
              home_id, organisation_id, status, is_active, photo_url
       FROM staff WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (!rows.length) {
      throw new AppError('Invalid email or password', 401);
    }

    const staff = rows[0];

    if (!staff.is_active || staff.status === 'terminated') {
      throw new AppError('Account is inactive. Contact your administrator.', 401);
    }

    if (staff.status === 'suspended') {
      throw new AppError('Account is suspended. Contact your administrator.', 401);
    }

    const passwordValid = await bcrypt.compare(password, staff.password_hash);
    if (!passwordValid) {
      logger.warn('Failed login attempt', { email, ip: ipAddress });
      throw new AppError('Invalid email or password', 401);
    }

    const payload: JwtPayload = {
      staffId: staff.id,
      organisationId: staff.organisation_id,
      homeId: staff.home_id,
      role: staff.role,
      email: staff.email,
    };

    const accessToken = this.signAccessToken(payload);
    const refreshToken = this.signRefreshToken(payload);

    // Store refresh token hash and update last login
    const refreshHash = await bcrypt.hash(refreshToken, 8);
    await query(
      'UPDATE staff SET refresh_token = $1, last_login = NOW() WHERE id = $2',
      [refreshHash, staff.id]
    );

    // Write login to audit log
    await query(
      `INSERT INTO audit_log (staff_id, home_id, action, ip_address)
       VALUES ($1, $2, 'LOGIN', $3)`,
      [staff.id, staff.home_id, ipAddress]
    );

    logger.info('Staff logged in', { staffId: staff.id, role: staff.role });

    return {
      accessToken,
      refreshToken,
      staff: {
        id: staff.id,
        email: staff.email,
        firstName: staff.first_name,
        lastName: staff.last_name,
        role: staff.role,
        homeId: staff.home_id,
        organisationId: staff.organisation_id,
        photoUrl: staff.photo_url,
      },
    };
  }

  // ── Refresh token ───────────────────────────────────────────────
  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new AppError('Server misconfiguration', 500);

    let payload: JwtPayload;
    try {
      payload = jwt.verify(refreshToken, secret) as JwtPayload;
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const rows = await query<{ refresh_token: string; is_active: boolean }>(
      'SELECT refresh_token, is_active FROM staff WHERE id = $1',
      [payload.staffId]
    );

    if (!rows.length || !rows[0].is_active || !rows[0].refresh_token) {
      throw new AppError('Session invalid', 401);
    }

    const tokenValid = await bcrypt.compare(refreshToken, rows[0].refresh_token);
    if (!tokenValid) throw new AppError('Token mismatch', 401);

    const newAccessToken = this.signAccessToken(payload);
    const newRefreshToken = this.signRefreshToken(payload);
    const newHash = await bcrypt.hash(newRefreshToken, 8);

    await query('UPDATE staff SET refresh_token = $1 WHERE id = $2', [newHash, payload.staffId]);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  // ── Logout ──────────────────────────────────────────────────────
  async logout(staffId: string, homeId: string | null): Promise<void> {
    await query('UPDATE staff SET refresh_token = NULL WHERE id = $1', [staffId]);
    await query(
      `INSERT INTO audit_log (staff_id, home_id, action) VALUES ($1, $2, 'LOGOUT')`,
      [staffId, homeId]
    );
  }

  // ── Change password ─────────────────────────────────────────────
  async changePassword(staffId: string, currentPassword: string, newPassword: string): Promise<void> {
    const rows = await query<{ password_hash: string }>(
      'SELECT password_hash FROM staff WHERE id = $1',
      [staffId]
    );
    if (!rows.length) throw new AppError('Staff not found', 404);

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) throw new AppError('Current password is incorrect', 400);

    if (newPassword.length < 10) {
      throw new AppError('New password must be at least 10 characters', 400);
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await query(
      'UPDATE staff SET password_hash = $1, refresh_token = NULL WHERE id = $2',
      [newHash, staffId]
    );
    logger.info('Password changed', { staffId });
  }

  // ── Hash a new password (for account creation) ──────────────────
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  // ── Token signing helpers ────────────────────────────────────────
  private signAccessToken(payload: JwtPayload): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new AppError('JWT_SECRET not configured', 500);
    return jwt.sign(payload, secret, {
      expiresIn: process.env.JWT_EXPIRES_IN as import('jsonwebtoken').SignOptions['expiresIn'] || '8h',
    });
  }

  private signRefreshToken(payload: JwtPayload): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new AppError('JWT_REFRESH_SECRET not configured', 500);
    const { iat, exp, ...cleanPayload } = payload;
    return jwt.sign(cleanPayload, secret, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN as import('jsonwebtoken').SignOptions['expiresIn'] || '30d',
    });
  }
}

export const authService = new AuthService();
