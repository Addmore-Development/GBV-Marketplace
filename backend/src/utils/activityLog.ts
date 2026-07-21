// ============================================================
// backend/src/utils/activityLog.ts
// Shared helper for recording centre/seller login & logout
// events so the admin dashboard can show recent activity.
// ============================================================
import { Request } from 'express';
import { pool } from '../index';

export type ActivityUserType = 'centre' | 'seller';
export type ActivityAction = 'login' | 'logout';

export const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || '';
};

export const logActivity = async (
  userType: ActivityUserType,
  userId: string,
  displayName: string | null,
  email: string | null,
  action: ActivityAction,
  ipAddress: string
): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO login_activity (user_type, user_id, display_name, email, action, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userType, userId, displayName, email, action, ipAddress]
    );
  } catch (err) {
    // Never let activity logging break the login/logout flow itself.
    console.error('[ActivityLog] failed to record activity:', err);
  }
};