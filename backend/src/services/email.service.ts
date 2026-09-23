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
// the product, not a generic purple notification card.
//
// Everything below is deliberately built as nested <table>s with every style written
// inline on the element itself, not as CSS classes in a <style> block. A received
// invoice email came back completely unstyled — Gmail (particularly its mobile app,
// which is what staff actually read mail in) strips <style> blocks from HTML email
// entirely and only reliably honours inline `style="..."` attributes. Inheritance
// from an inline-styled ancestor still works normally, so the body text default
// (colour/line-height/font) is set once on the content cell rather than on every
// single <p>/<li> the template functions below generate.
function wrap(body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9">
      <tr><td align="center" style="padding:32px 16px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.1)">
          <tr><td style="background:#0d1526;padding:24px 32px">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:14px"><img src="https://compcarehub.co.uk/pwa-192.png" width="44" height="44" alt="CompCare Hub" style="width:44px;height:44px;border-radius:10px;background:#ffffff;padding:3px;display:block" /></td>
              <td>
                <div style="color:#e8b130;font-size:20px;font-weight:700;font-family:Georgia,serif">CompCare Hub</div>
                <div style="color:#a8a29e;font-size:12px;margin-top:2px">Care Home Management System</div>
              </td>
            </tr></table>
          </td></tr>
          <tr><td style="height:4px;background:#e8b130;line-height:4px;font-size:4px">&nbsp;</td></tr>
          <tr><td style="padding:32px;color:#374151;font-size:14px;line-height:1.6;font-family:Arial,Helvetica,sans-serif">${body}</td></tr>
          <tr><td style="background:#f8fafc;padding:20px 32px;font-size:12px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0">This email was sent via CompCare Hub. Please do not reply directly.</td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
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

  // Same reasoning as wrap() above — a received copy of this exact invoice came back
  // from Gmail with none of its styling applied, because Gmail strips <style> blocks.
  // Rebuilt as nested tables with every style inline so the layout, colours and
  // borders actually survive being read in Gmail (web or mobile app).
  const td = 'padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#1e293b">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9">
      <tr><td align="center" style="padding:32px 16px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px">
          <tr><td style="padding:40px">

            <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:18px"><tr>
              <td><img src="https://compcarehub.co.uk/pwa-192.png" alt="CompCare Hub" width="40" height="40" style="border-radius:9px;display:block" /></td>
            </tr></table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px"><tr>
              <td style="font-size:32px;letter-spacing:2px;font-weight:700;color:#0f172a">INVOICE</td>
              <td align="right" style="font-size:13px;color:#64748b;vertical-align:top">Invoice No: ${invoiceNo}<br/>Date: ${issueDate}</td>
            </tr></table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px"><tr>
              <td width="50%" style="font-size:13px;line-height:1.6;vertical-align:top">
                <div style="font-size:11px;letter-spacing:1px;color:#64748b;margin-bottom:4px">BILL TO</div>
                ${invoice.first_name} ${invoice.last_name}
              </td>
              <td width="50%" style="font-size:13px;line-height:1.6;vertical-align:top">
                <div style="font-size:11px;letter-spacing:1px;color:#64748b;margin-bottom:4px">FROM</div>
                ${home.name}${homeAddress ? `<br/>${homeAddress}` : ''}${home.phone ? `<br/>${home.phone}` : ''}${home.email ? `<br/>${home.email}` : ''}
              </td>
            </tr></table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:24px 0">
              <tr>
                <td style="background:#1e293b;color:#fff;text-align:left;padding:10px 12px;font-size:11px;letter-spacing:0.5px">Description</td>
                <td style="background:#1e293b;color:#fff;text-align:right;padding:10px 12px;font-size:11px;letter-spacing:0.5px">Rate</td>
                <td style="background:#1e293b;color:#fff;text-align:right;padding:10px 12px;font-size:11px;letter-spacing:0.5px">Hours</td>
                <td style="background:#1e293b;color:#fff;text-align:right;padding:10px 12px;font-size:11px;letter-spacing:0.5px">Total</td>
              </tr>
              <tr>
                <td style="${td}">Care services — ${monthLabel}</td>
                <td style="${td}text-align:right">${rate ? `£${rate.toFixed(2)}/hr` : '—'}</td>
                <td style="${td}text-align:right">${hours ? hours.toFixed(1) : '—'}</td>
                <td style="${td}text-align:right">£${total.toFixed(2)}</td>
              </tr>
            </table>

            <table role="presentation" cellpadding="0" cellspacing="0" style="width:60%;margin-left:auto;font-size:13px">
              <tr><td style="padding:6px 12px">Subtotal</td><td align="right" style="padding:6px 12px">£${total.toFixed(2)}</td></tr>
              <tr><td style="padding:6px 12px;background:#1e293b;color:#fff;font-weight:700;font-size:15px">Amount Due</td><td align="right" style="padding:6px 12px;background:#1e293b;color:#fff;font-weight:700;font-size:15px">£${total.toFixed(2)}</td></tr>
            </table>

            ${invoice.notes ? `<p style="font-size:13px;margin-top:20px"><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
            <p style="text-align:center;font-size:26px;font-style:italic;color:#1e293b;margin:32px 0 8px">Thank You!</p>
            <div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:24px">This invoice was sent via CompCare Hub on behalf of ${home.name}.</div>

          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}
