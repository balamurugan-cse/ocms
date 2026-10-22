import nodemailer from 'nodemailer';
import crypto from 'crypto';

export interface EmailDispatchRecord {
  id: string;
  recipient: string;
  subject: string;
  type: 'verification' | 'password_reset' | 'status_notification';
  token?: string;
  actionUrl?: string;
  deliveredViaSmtp: boolean;
  smtpMessageId?: string;
  status: 'sent' | 'smtp_unconfigured' | 'smtp_error';
  errorMessage?: string;
  timestamp: string;
}

// In-memory persistent delivery journal for system observability & verification link testing
export const emailDeliveryJournal: EmailDispatchRecord[] = [];

/**
 * Creates SMTP transporter if valid environment credentials are provided.
 */
function getSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const portStr = process.env.SMTP_PORT || '587';
  const port = parseInt(portStr, 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // Check if SMTP is valid (ignore dummy container values like 123456 and enforce valid port range 1-65535)
  if (
    !host ||
    !user ||
    !pass ||
    host === 'YOUR_REAL_SMTP_HOST' ||
    host === '123456' ||
    user === '123456' ||
    user.includes('YOUR_VERIFIED') ||
    isNaN(port) ||
    port < 1 ||
    port > 65535
  ) {
    return null;
  }

  try {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });
  } catch (err) {
    console.warn('[SMTP] Transporter creation failed, falling back to outbox:', err);
    return null;
  }
}

/**
 * Generates a cryptographically secure token and its SHA-256 hash.
 */
export function generateSecureToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

/**
 * Computes the SHA-256 hash of a provided raw token.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Sends or records an account verification email.
 */
export async function sendVerificationEmail(
  toEmail: string,
  recipientName: string,
  rawToken: string,
  clientOrigin: string
): Promise<{ success: boolean; messageId?: string; actionUrl: string; smtpStatus: string }> {
  const verificationUrl = `${clientOrigin.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(rawToken)}`;
  const mailFrom = process.env.MAIL_FROM || 'DMI Grievance Redressal <grievance@dmice.ac.in>';
  
  const subject = 'Verify your DMI College of Engineering Grievance Account';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Email Verification</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
        .card { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px; }
        .header { border-bottom: 2px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 24px; }
        .title { font-size: 20px; font-weight: 700; color: #1e3a8a; margin: 0; }
        .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
        .btn { display: inline-block; background: #1e3a8a; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 20px 0; }
        .footer { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 class="title">DMI College of Engineering</h1>
          <p class="subtitle">Online Complaint Management System (OCMS) • Palanchur, Chennai</p>
        </div>
        <p>Hello <strong>${recipientName}</strong>,</p>
        <p>Thank you for registering on the DMI Online Grievance Redressal Portal. In accordance with AICTE & Anna University governance standards, please verify your email address to activate your account and lodge complaints.</p>
        <div style="text-align: center;">
          <a href="${verificationUrl}" class="btn">Verify Email Address</a>
        </div>
        <p style="font-size: 13px; color: #475569;">Or copy and paste this secure link into your browser:</p>
        <p style="font-size: 12px; word-break: break-all; background: #f1f5f9; padding: 8px; border-radius: 4px; font-family: monospace;">${verificationUrl}</p>
        <p style="font-size: 12px; color: #64748b;">This verification token is single-use and will expire in 20 minutes.</p>
        <div class="footer">
          <p>DMI College of Engineering, Palanchur, Chennai - 600 123.<br>If you did not create this account, please disregard this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const record: EmailDispatchRecord = {
    id: 'disp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    recipient: toEmail,
    subject,
    type: 'verification',
    token: rawToken,
    actionUrl: verificationUrl,
    deliveredViaSmtp: false,
    status: 'sent',
    timestamp: new Date().toISOString()
  };

  const transporter = getSmtpTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: mailFrom,
        to: toEmail,
        subject,
        html,
        text: `Verify your DMI OCMS account: ${verificationUrl}`
      });
      record.deliveredViaSmtp = true;
      record.smtpMessageId = info.messageId;
      record.status = 'sent';
      emailDeliveryJournal.unshift(record);
      return { success: true, messageId: info.messageId, actionUrl: verificationUrl, smtpStatus: 'Delivered via SMTP' };
    } catch (err: any) {
      console.error('[SMTP Delivery Error]', err);
      record.status = 'smtp_error';
      record.errorMessage = err.message || 'SMTP delivery rejected by host';
      emailDeliveryJournal.unshift(record);
      return { success: false, actionUrl: verificationUrl, smtpStatus: `SMTP Error: ${err.message}` };
    }
  } else {
    // Record into outbox journal so the tester can verify immediately
    record.status = 'smtp_unconfigured';
    emailDeliveryJournal.unshift(record);
    return {
      success: true,
      actionUrl: verificationUrl,
      smtpStatus: 'Recorded in outbox (SMTP not configured in environment; link ready for testing)'
    };
  }
}

/**
 * Sends a notification email when a complaint status or assignment changes.
 */
export async function sendComplaintStatusNotification(
  toEmail: string,
  recipientName: string,
  ticketNumber: string,
  newStatus: string,
  notes: string,
  clientOrigin: string
): Promise<void> {
  const ticketUrl = `${clientOrigin.replace(/\/$/, '')}/?ticket=${encodeURIComponent(ticketNumber)}`;
  const mailFrom = process.env.MAIL_FROM || 'DMI Grievance Redressal <grievance@dmice.ac.in>';
  const subject = `[${ticketNumber}] Status Updated: ${newStatus.toUpperCase().replace('_', ' ')}`;

  const record: EmailDispatchRecord = {
    id: 'disp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    recipient: toEmail,
    subject,
    type: 'status_notification',
    actionUrl: ticketUrl,
    deliveredViaSmtp: false,
    status: 'sent',
    timestamp: new Date().toISOString()
  };

  const transporter = getSmtpTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: mailFrom,
        to: toEmail,
        subject,
        html: `
          <div style="font-family: sans-serif; max-width: 580px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1e3a8a; margin-top: 0;">DMI Grievance Update</h2>
            <p>Dear <strong>${recipientName}</strong>,</p>
            <p>Your grievance <strong>${ticketNumber}</strong> has been updated to: <span style="font-weight: 700; color: #1e3a8a;">${newStatus.toUpperCase().replace('_', ' ')}</span></p>
            ${notes ? `<p><strong>Update Notes:</strong> ${notes}</p>` : ''}
            <p><a href="${ticketUrl}" style="background: #1e3a8a; color: #fff; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">View Live Timeline</a></p>
          </div>
        `
      });
      record.deliveredViaSmtp = true;
      record.smtpMessageId = info.messageId;
    } catch (err: any) {
      console.error('[SMTP Status Notification Error]', err);
      record.status = 'smtp_error';
      record.errorMessage = err.message;
    }
  } else {
    record.status = 'smtp_unconfigured';
  }
  emailDeliveryJournal.unshift(record);
}
