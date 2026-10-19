// src/email/email.service.ts — transactional email via Resend.
// Graceful no-op when RESEND_API_KEY is unset (offline demo stays green).
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface AdmissionCredentialsEmail {
  to: string;
  studentName: string;
  applicationId: string;
  username: string;
  password: string;
  classWanted: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    this.from = config.get<string>('RESEND_FROM') ?? 'Guzia Bilateral High School <onboarding@resend.dev>';
    this.resend = apiKey ? new Resend(apiKey) : null;
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY not set — admission emails will be skipped (credentials shown on-screen only).');
    }
  }

  get enabled(): boolean {
    return this.resend !== null;
  }

  /** Send admission portal credentials. Returns true when actually sent. */
  async sendAdmissionCredentials(input: AdmissionCredentialsEmail): Promise<boolean> {
    if (!this.resend) return false;
    try {
      await this.resend.emails.send({
        from: this.from,
        to: input.to,
        subject: 'Your Guzia Bilateral High School admission application — portal credentials',
        html: this.admissionCredentialsHtml(input),
      });
      this.logger.log(`Admission credentials emailed to ${input.to}`);
      return true;
    } catch (err) {
      // Never fail the application over an email hiccup.
      this.logger.error(`Resend failed for ${input.to}: ${(err as Error).message}`);
      return false;
    }
  }

  private admissionCredentialsHtml(i: AdmissionCredentialsEmail): string {
    return `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
        <div style="background:#FE5B09;color:#fff;padding:20px 24px">
          <h2 style="margin:0;font-size:18px;text-transform:uppercase;letter-spacing:1px">Guzia Bilateral High School</h2>
          <p style="margin:4px 0 0;font-size:12px;opacity:.9">Admission Application Received</p>
        </div>
        <div style="padding:24px;color:#333;font-size:14px;line-height:1.6">
          <p>Dear <strong>${this.esc(i.studentName)}</strong>,</p>
          <p>Thank you for applying to Guzia Bilateral High School for <strong>${this.esc(i.classWanted)}</strong>.
          Your application (<strong>#${this.esc(i.applicationId)}</strong>) has been received and is under review.</p>
          <p>Below are your portal credentials. Use them to log in at the school portal and track your application status.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border:1px solid #eee;background:#fafafa;width:120px"><strong>Username</strong></td><td style="padding:8px;border:1px solid #eee">${this.esc(i.username)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #eee;background:#fafafa"><strong>Password</strong></td><td style="padding:8px;border:1px solid #eee;font-family:monospace"><strong>${this.esc(i.password)}</strong></td></tr>
          </table>
          <p style="font-size:12px;color:#888">Please change your password after first login. Do not share these credentials.</p>
          <p style="font-size:12px;color:#888">— Guzia Bilateral High School</p>
        </div>
      </div>`;
  }

  private esc(s: string): string {
    return s.replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
    );
  }
}
