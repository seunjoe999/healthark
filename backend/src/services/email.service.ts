import nodemailer from 'nodemailer';
import { logger } from '../config/logger';

function createTransport() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || '';
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS || '';

  if (!user || !pass) {
    logger.warn('Email: SMTP_USER/SMTP_PASS (or EMAIL_USER/EMAIL_PASSWORD) not set — emails will not send');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    // Force IPv4 lookup because Render's free tier sometimes fails resolving IPv6 for smtp.gmail.com
    family: 4 
  });
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const transport = createTransport();
  if (!transport) return { ok: false, error: 'Email not configured — set SMTP_USER and SMTP_PASS' };

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@compcarehub.com';
  try {
    const info = await transport.sendMail({ from: `CompCare Hub <${from}>`, to: opts.to, subject: opts.subject, html: opts.html, replyTo: opts.replyTo });
    logger.info(`Email sent to ${opts.to} — messageId: ${info.messageId}`);
    return { ok: true, messageId: info.messageId };
  } catch (err: any) {
    logger.error(`Email failed: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

// ── Email templates ────────────────────────────────────────────────────────────

function wrap(body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
    .card{background:#fff;max-width:600px;margin:32px auto;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
    .header{background:#7c3aed;padding:28px 32px}
    .header h1{color:#fff;margin:0;font-size:20px;font-weight:700}
    .header p{color:#e9d5ff;margin:4px 0 0;font-size:13px}
    .body{padding:32px}
    .body p{color:#374151;line-height:1.6;margin:0 0 14px}
    .body ul{color:#374151;line-height:1.7;padding-left:20px}
    .footer{background:#f1f5f9;padding:20px 32px;font-size:12px;color:#94a3b8;text-align:center}
    .btn{display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0}
  </style></head><body><div class="card">
    <div class="header"><h1>CompCare Hub</h1><p>Care Home Management System</p></div>
    <div class="body">${body}</div>
    <div class="footer">This email was sent via CompCare Hub. Please do not reply directly.</div>
  </div></body></html>`;
}

export function interviewInviteEmail(candidate: { first_name: string; last_name: string; position: string }, details: { date: string; time: string; location: string; contactName: string; contactEmail: string }) {
  return wrap(`
    <p>Dear ${candidate.first_name} ${candidate.last_name},</p>
    <p>Thank you for applying for the position of <strong>${candidate.position}</strong>. We are pleased to invite you to an interview.</p>
    <p><strong>Interview details:</strong></p>
    <ul>
      <li><strong>Date:</strong> ${details.date}</li>
      <li><strong>Time:</strong> ${details.time}</li>
      <li><strong>Location:</strong> ${details.location}</li>
    </ul>
    <p>Please confirm your attendance by replying to this email or contacting <strong>${details.contactName}</strong> at <a href="mailto:${details.contactEmail}">${details.contactEmail}</a>.</p>
    <p>Please bring the following to your interview:</p>
    <ul>
      <li>Proof of identity (passport or driving licence)</li>
      <li>Two references (names and contact details)</li>
      <li>Proof of right to work in the UK</li>
      <li>Any relevant qualifications or certificates</li>
    </ul>
    <p>We look forward to meeting you.</p>
    <p>Kind regards,<br/><strong>${details.contactName}</strong></p>
  `);
}

export function applicationReceivedEmail(candidate: { first_name: string; last_name: string; position: string }) {
  return wrap(`
    <p>Dear ${candidate.first_name} ${candidate.last_name},</p>
    <p>Thank you for your interest in the position of <strong>${candidate.position}</strong> at our care home.</p>
    <p>We have received your application and our team will review it carefully. We will be in touch within 5–7 working days to let you know the outcome.</p>
    <p>In the meantime, if you have any questions please do not hesitate to contact us.</p>
    <p>Kind regards,<br/>The Recruitment Team</p>
  `);
}

export function referenceRequestEmail(candidate: { first_name: string; last_name: string; position: string }, referee: { name: string }) {
  return wrap(`
    <p>Dear ${referee.name},</p>
    <p><strong>${candidate.first_name} ${candidate.last_name}</strong> has applied for the position of <strong>${candidate.position}</strong> at our care home and has given your details as a referee.</p>
    <p>We would be grateful if you could provide a reference for this individual. Please reply to this email with:</p>
    <ul>
      <li>How long you have known the applicant and in what capacity</li>
      <li>Their key skills, strengths, and suitability for a care role</li>
      <li>Their attendance and reliability</li>
      <li>Any areas for development</li>
      <li>Whether you would recommend them for this position</li>
    </ul>
    <p>This information will be treated in strict confidence and used only for recruitment purposes.</p>
    <p>Thank you for your time.</p>
    <p>Kind regards,<br/>The Recruitment Team</p>
  `);
}

export function offerLetterEmail(candidate: { first_name: string; last_name: string; position: string }, details: { startDate: string; salary?: string; contactName: string; contactEmail: string }) {
  return wrap(`
    <p>Dear ${candidate.first_name} ${candidate.last_name},</p>
    <p>We are delighted to offer you the position of <strong>${candidate.position}</strong> at our care home.</p>
    ${details.startDate ? `<p><strong>Proposed start date:</strong> ${details.startDate}</p>` : ''}
    ${details.salary ? `<p><strong>Salary:</strong> ${details.salary}</p>` : ''}
    <p>This offer is subject to:</p>
    <ul>
      <li>Satisfactory references</li>
      <li>Enhanced DBS check clearance</li>
      <li>Proof of right to work in the UK</li>
      <li>Completion of all required pre-employment checks</li>
    </ul>
    <p>Please confirm your acceptance by replying to this email or contacting <strong>${details.contactName}</strong> at <a href="mailto:${details.contactEmail}">${details.contactEmail}</a>.</p>
    <p>We look forward to welcoming you to our team.</p>
    <p>Kind regards,<br/><strong>${details.contactName}</strong></p>
  `);
}

export function rejectionEmail(candidate: { first_name: string; last_name: string; position: string }) {
  return wrap(`
    <p>Dear ${candidate.first_name} ${candidate.last_name},</p>
    <p>Thank you for your interest in the position of <strong>${candidate.position}</strong> at our care home and for taking the time to apply.</p>
    <p>After careful consideration, we regret to inform you that we will not be progressing with your application on this occasion. This was a competitive process and the decision was not an easy one.</p>
    <p>We wish you every success in your job search and future career.</p>
    <p>Kind regards,<br/>The Recruitment Team</p>
  `);
}

export function customEmail(candidate: { first_name: string; last_name: string }, messageHtml: string) {
  return wrap(`<p>Dear ${candidate.first_name} ${candidate.last_name},</p>${messageHtml}<p>Kind regards,<br/>The Recruitment Team</p>`);
}
