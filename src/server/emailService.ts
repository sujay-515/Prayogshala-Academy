// ============================================================================
// MedLab QBank — Transactional Email Service via Resend
// ============================================================================

export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const from = (process.env.EMAIL_FROM || 'MedLab QBank <onboarding@resend.dev>').trim();

  if (!apiKey) {
    console.log(`[Resend Mock Email] To: ${to} | Subject: "${subject}" | (Configure RESEND_API_KEY in .env to deliver real emails)`);
    return { success: true, id: 'mock-resend-id' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[Resend Error]', data);
      return { success: false, error: data?.message || 'Failed to send email via Resend' };
    }

    return { success: true, id: data.id };
  } catch (err: any) {
    console.error('[Resend Network Error]', err);
    return { success: false, error: err.message || 'Network error reaching Resend' };
  }
}

/**
 * 1. Welcome email for new candidates upon registration
 */
export async function sendWelcomeEmail(to: string, displayName: string) {
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
          .card { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { border-bottom: 2px solid #06b6d4; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }
          .badge { display: inline-block; background: #ecfeff; color: #0e7490; font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 6px; margin-top: 6px; border: 1px solid #cffafe; }
          .content { font-size: 14px; line-height: 1.6; color: #334155; }
          .button { display: inline-block; background: #0891b2; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 20px; }
          .footer { font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 class="title">MedLab QBank</h1>
            <div class="badge">Laboratory Medicine & Pathology Licensing</div>
          </div>
          <div class="content">
            <p>Hello <strong>${escapeHtml(displayName)}</strong>,</p>
            <p>Welcome to MedLab QBank. Your student candidate profile is now active and ready for your certification preparation.</p>
            <p>With your account, your progress, timed mock exams, bookmarks, and subject mastery analytics will automatically sync across devices.</p>
            <a href="${escapeHtml(appUrl)}" class="button" style="color: #ffffff;">Launch Question Bank</a>
          </div>
          <div class="footer">
            Syllabi aligned with ASCP · NHPC · PSC · DHA · AIMS licensing guidelines.<br>
            If you did not create this account, please ignore this email.
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: 'Welcome to MedLab QBank — Clinical Pathology Repository',
    html,
  });
}

/**
 * 2. Staff Invitation email for new administrator or pathology staff
 */
export async function sendStaffInviteEmail(
  to: string,
  displayName: string,
  role: 'superadmin' | 'admin',
  tempPassword?: string
) {
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const roleLabel = role === 'superadmin' ? 'Head Administrator (Lead Staff)' : 'Pathology Staff Administrator';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
          .card { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }
          .badge { display: inline-block; background: #0f172a; color: #22d3ee; font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 6px; margin-top: 6px; }
          .content { font-size: 14px; line-height: 1.6; color: #334155; }
          .cred-box { background: #f1f5f9; border-left: 4px solid #0891b2; padding: 12px 16px; border-radius: 6px; margin: 16px 0; font-family: monospace; font-size: 13px; }
          .button { display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 20px; }
          .footer { font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 class="title">MedLab QBank Staff Console</h1>
            <div class="badge">Administrative Invitation</div>
          </div>
          <div class="content">
            <p>Hello <strong>${escapeHtml(displayName)}</strong>,</p>
            <p>You have been granted <strong>${escapeHtml(roleLabel)}</strong> access to the MedLab QBank pathology management system.</p>
            <p>You can now manage the question bank repository, review student-reported errors, import PDF exams, and configure syllabus hierarchies.</p>
            ${
              tempPassword
                ? `<div class="cred-box">
                    <strong>Email:</strong> ${escapeHtml(to)}<br>
                    <strong>Temporary Password:</strong> ${escapeHtml(tempPassword)}
                  </div>
                  <p>Please log in and update your password immediately.</p>`
                : ''
            }
            <a href="${escapeHtml(appUrl)}/admin" class="button" style="color: #ffffff;">Access Staff Console</a>
          </div>
          <div class="footer">
            MedLab QBank Pathology Review & Ingestion System.<br>
            Authorized medical staff access only.
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `Staff Access Granted — MedLab QBank (${roleLabel})`,
    html,
  });
}

/**
 * 3. Email ownership verification
 */
export async function sendVerificationEmail(to: string, displayName: string, verifyToken: string) {
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const verifyLink = `${appUrl}/verify-email?token=${encodeURIComponent(verifyToken)}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
          .card { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { border-bottom: 2px solid #0891b2; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }
          .content { font-size: 14px; line-height: 1.6; color: #334155; }
          .button { display: inline-block; background: #0891b2; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 20px; }
          .footer { font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 class="title">MedLab QBank</h1>
          </div>
          <div class="content">
            <p>Hello ${escapeHtml(displayName || 'there')},</p>
            <p>Confirm the email address for your MedLab QBank account so it can be used for password recovery and Grand Test leaderboard ranking.</p>
            <p>This link is valid for 24 hours.</p>
            <a href="${escapeHtml(verifyLink)}" class="button" style="color: #ffffff;">Verify Email</a>
            <p style="margin-top: 24px; font-size: 12px; color: #64748b;">
              If the button does not work, copy and paste this URL into your browser:<br>
              <a href="${escapeHtml(verifyLink)}" style="color: #0891b2;">${escapeHtml(verifyLink)}</a>
            </p>
          </div>
          <div class="footer">
            If you did not create this account, you can safely ignore this email.
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: 'Verify your MedLab QBank email address',
    html,
  });
}

/**
 * 4. Password Reset email
 */
export async function sendPasswordResetEmail(to: string, resetToken: string) {
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const resetLink = `${appUrl}?reset_token=${encodeURIComponent(resetToken)}#reset-password`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
          .card { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { border-bottom: 2px solid #0891b2; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }
          .content { font-size: 14px; line-height: 1.6; color: #334155; }
          .button { display: inline-block; background: #0891b2; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 20px; }
          .footer { font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 class="title">MedLab QBank</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset the password for your MedLab QBank account associated with <strong>${escapeHtml(to)}</strong>.</p>
            <p>Click the link below to set a new password. This link is valid for 1 hour.</p>
            <a href="${escapeHtml(resetLink)}" class="button" style="color: #ffffff;">Reset Password</a>
            <p style="margin-top: 24px; font-size: 12px; color: #64748b;">
              If the button does not work, copy and paste this URL into your browser:<br>
              <a href="${escapeHtml(resetLink)}" style="color: #0891b2;">${escapeHtml(resetLink)}</a>
            </p>
          </div>
          <div class="footer">
            If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: 'Reset your MedLab QBank password',
    html,
  });
}
