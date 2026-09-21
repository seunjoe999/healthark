import webpush from 'web-push';
import { query } from '../config/database';
import { logger } from '../config/logger';

const publicKey = process.env.VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@compcarehub.co.uk';

let configured = false;
if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
} else {
  logger.warn('Push: VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set — browser push notifications will not send');
}

export function getVapidPublicKey(): string {
  return publicKey;
}

// Sends a browser push notification to every device a staff member has subscribed
// from (they may have more than one — phone + tablet, say). Dead subscriptions
// (410 Gone / 404) are removed so they stop being retried on every future send.
export async function sendPushToStaff(staffId: string, payload: { title: string; body: string; url?: string }) {
  if (!configured || !staffId) return;
  try {
    const subs = await query<any>('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE staff_id = $1', [staffId]);
    if (!subs.length) return;
    const body = JSON.stringify(payload);
    await Promise.all(subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } } as any,
          body
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]).catch(() => {});
        } else {
          logger.warn(`Push send failed for staff ${staffId}: ${err.message}`);
        }
      }
    }));
  } catch (err: any) {
    logger.warn(`Push: sendPushToStaff error: ${err.message}`);
  }
}

export async function sendPushToStaffMany(staffIds: string[], payload: { title: string; body: string; url?: string }) {
  await Promise.all([...new Set(staffIds.filter(Boolean))].map(id => sendPushToStaff(id, payload)));
}
