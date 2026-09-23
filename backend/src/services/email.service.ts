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
    host: process.env.SMTP_HOST || 'smtp.resend.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, 
    requireTLS: true,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    family: 4 
  } as any);
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  bcc?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS || '';
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'onboarding@resend.dev';

  if (!pass) return { ok: false, error: 'Email not configured' };

  try {
    // IF USING RESEND: Use their HTTP REST API to bypass Render's strict SMTP Port blocking
    if (pass.startsWith('re_')) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pass}`
        },
        body: JSON.stringify({
          from: from,
          to: opts.to,
          subject: opts.subject,
          html: opts.html,
          // Only send reply_to if it exists and looks like a valid email string
          ...(opts.replyTo && opts.replyTo.includes('@') ? { reply_to: opts.replyTo } : {}),
          ...(opts.bcc ? { bcc: opts.bcc } : {})
        })
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.message || 'Resend API Error');
      
      logger.info(`Email sent via Resend API to ${opts.to} — id: ${data.id}`);
      return { ok: true, messageId: data.id };
    }

    // FALLBACK: Standard SMTP
    const transport = createTransport();
    if (!transport) return { ok: false, error: 'Email not configured — set SMTP_USER and SMTP_PASS' };

    const info = await transport.sendMail({ from: `CompCare Hub <${from}>`, to: opts.to, subject: opts.subject, html: opts.html, replyTo: opts.replyTo, bcc: opts.bcc });
    logger.info(`Email sent to ${opts.to} — messageId: ${info.messageId}`);
    return { ok: true, messageId: info.messageId };
  } catch (err: any) {
    logger.error(`Email failed: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

// ── Email templates ────────────────────────────────────────────────────────────

// Branded like the rest of the app's printed documents (care plans, invoices) — the
// actual CompCare Hub logo plus the gold/near-black palette used everywhere else in
// the product, not a generic purple notification card. Manager specifically asked
// for this after recruitment emails were landing looking too plain/basic.
function wrap(body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:0}
    .card{background:#fff;max-width:600px;margin:32px auto;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.1)}
    .header{background:#0d1526;padding:24px 32px}
    .header img{width:44px;height:44px;border-radius:10px;background:#fff;padding:3px;display:block}
    .header h1{color:#e8b130;margin:0;font-size:20px;font-weight:700;font-family:Georgia,serif}
    .header p{color:#a8a29e;margin:2px 0 0;font-size:12px}
    .accent{height:4px;background:linear-gradient(90deg,#e8b130,#d4961a)}
    .body{padding:32px}
    .body p{color:#374151;line-height:1.6;margin:0 0 14px}
    .body ul{color:#374151;line-height:1.7;padding-left:20px}
    .footer{background:#f8fafc;padding:20px 32px;font-size:12px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0}
    .btn{display:inline-block;background:linear-gradient(135deg,#e8b130,#d4961a);color:#0a0a0a;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0}
  </style></head><body><div class="card">
    <div class="header">
      <!-- table, not flexbox, for the logo+title row — Outlook's rendering engine
           (Word) ignores flexbox entirely, so a table is the only layout that
           reliably lines these up across every mail client. -->
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="padding-right:14px"><img src="https://compcarehub.co.uk/pwa-192.png" alt="CompCare Hub" /></td>
        <td><h1>CompCare Hub</h1><p>Care Home Management System</p></td>
      </tr></table>
    </div>
    <div class="accent"></div>
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
    <p>Please confirm your acceptance by replying to this email or contacting <strong>${details.contactName}</strong>${details.contactEmail.includes('@') ? ` at <a href="mailto:${details.contactEmail}">${details.contactEmail}</a>` : ''}.</p>
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

// Standalone invoice document layout (not the generic `wrap()` notification card) —
// mirrors the header/Bill-To-From/itemised-table/Thank-You structure the manager
// asked for from a reference template, adapted to what this app actually tracks
// (a single monthly care-services line, not a multi-item cart): resident is the
// "Bill To", the issuing home is the "From", and hours × rate is the one line item.
export function invoiceEmail(
  invoice: { id: string; first_name: string; last_name: string; month_date: string; commissioned_hours?: number | null; hourly_rate?: number | null; invoice_amount: number; notes?: string | null; created_at?: string },
  home: { name: string; address1?: string | null; address2?: string | null; address3?: string | null; postcode?: string | null; phone?: string | null; email?: string | null }
) {
  const monthLabel = new Date(invoice.month_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const invoiceNo = invoice.id.slice(0, 8).toUpperCase();
  const issueDate = new Date(invoice.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const hours = invoice.commissioned_hours ? parseFloat(String(invoice.commissioned_hours)) : null;
  const rate = invoice.hourly_rate ? parseFloat(String(invoice.hourly_rate)) : null;
  const total = parseFloat(String(invoice.invoice_amount || 0));
  const homeAddress = [home.address1, home.address2, home.address3, home.postcode].filter(Boolean).join(', ');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:0;color:#1e293b}
    .card{background:#fff;max-width:600px;margin:32px auto;padding:40px;border-radius:8px}
    .title{font-size:32px;letter-spacing:2px;font-weight:700;color:#0f172a;margin:0}
    .meta{text-align:right;font-size:13px;color:#64748b}
    .cols{display:table;width:100%;margin:28px 0}
    .col{display:table-cell;width:50%;vertical-align:top;font-size:13px;line-height:1.6}
    .col strong{display:block;font-size:11px;letter-spacing:1px;color:#64748b;margin-bottom:4px}
    table.items{width:100%;border-collapse:collapse;margin:24px 0;font-size:13px}
    table.items th{background:#1e293b;color:#fff;text-align:left;padding:10px 12px;font-size:11px;letter-spacing:0.5px}
    table.items th.r,table.items td.r{text-align:right}
    table.items td{padding:10px 12px;border-bottom:1px solid #e2e8f0}
    .totals{width:60%;margin-left:auto;font-size:13px}
    .totals tr td{padding:6px 12px}
    .totals tr.due td{background:#1e293b;color:#fff;font-weight:700;font-size:15px}
    .thanks{text-align:center;font-size:26px;font-style:italic;color:#1e293b;margin:32px 0 8px}
    .footer{text-align:center;font-size:11px;color:#94a3b8;margin-top:24px}
  </style></head><body><div class="card">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:18px"><tr>
      <td><img src="https://compcarehub.co.uk/pwa-192.png" alt="CompCare Hub" width="40" height="40" style="border-radius:9px;display:block" /></td>
    </tr></table>
    <div class="cols">
      <div class="col"><p class="title">INVOICE</p></div>
      <div class="col meta">Invoice No: ${invoiceNo}<br/>Date: ${issueDate}</div>
    </div>
    <div class="cols">
      <div class="col"><strong>Bill To</strong>${invoice.first_name} ${invoice.last_name}</div>
      <div class="col"><strong>From</strong>${home.name}${homeAddress ? `<br/>${homeAddress}` : ''}${home.phone ? `<br/>${home.phone}` : ''}${home.email ? `<br/>${home.email}` : ''}</div>
    </div>
    <table class="items">
      <tr><th>Description</th><th class="r">Rate</th><th class="r">Hours</th><th class="r">Total</th></tr>
      <tr>
        <td>Care services — ${monthLabel}</td>
        <td class="r">${rate ? `£${rate.toFixed(2)}/hr` : '—'}</td>
        <td class="r">${hours ? hours.toFixed(1) : '—'}</td>
        <td class="r">£${total.toFixed(2)}</td>
      </tr>
    </table>
    <table class="totals">
      <tr><td>Subtotal</td><td class="r">£${total.toFixed(2)}</td></tr>
      <tr class="due"><td>Amount Due</td><td class="r">£${total.toFixed(2)}</td></tr>
    </table>
    ${invoice.notes ? `<p style="font-size:13px;margin-top:20px"><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
    <p class="thanks">Thank You!</p>
    <div class="footer">This invoice was sent via CompCare Hub on behalf of ${home.name}.</div>
  </div></body></html>`;
}
