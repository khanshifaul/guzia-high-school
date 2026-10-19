// src/email/email.service.ts — transactional email via Resend.
// Graceful no-op when RESEND_API_KEY is unset (offline demo stays green).
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface AdmissionReceivedEmail {
  to: string;
  studentName: string;
  applicationId: string;
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
      this.logger.warn('RESEND_API_KEY not set — admission emails will be skipped (the receipt is shown on-screen only).');
    }
  }

  get enabled(): boolean {
    return this.resend !== null;
  }

  /** Send the application acknowledgement. Returns true when actually sent. */
  async sendAdmissionReceived(input: AdmissionReceivedEmail): Promise<boolean> {
    if (!this.resend) return false;
    try {
      await this.resend.emails.send({
        from: this.from,
        to: input.to,
        subject: 'Your Guzia Bilateral High School admission application — received',
        html: this.admissionReceivedHtml(input),
      });
      this.logger.log(`Admission acknowledgement emailed to ${input.to}`);
      return true;
    } catch (err) {
      // Never fail the application over an email hiccup.
      this.logger.error(`Resend failed for ${input.to}: ${(err as Error).message}`);
      return false;
    }
  }

  private admissionReceivedHtml(i: AdmissionReceivedEmail): string {
    return `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
        <div style="background:#FE5B09;color:#fff;padding:20px 24px">
          <h2 style="margin:0;font-size:18px;text-transform:uppercase;letter-spacing:1px">Guzia Bilateral High School</h2>
          <p style="margin:4px 0 0;font-size:12px;opacity:.9">Admission Application Received</p>
        </div>
        <div style="padding:24px;color:#333;font-size:14px;line-height:1.6">
          <p>Dear <strong>${this.esc(i.studentName)}</strong>,</p>
          <p>Thank you for applying to Guzia Bilateral High School for <strong>${this.esc(i.classWanted)}</strong>.
          Your application has been received and is under review.</p>
          <p style="margin-bottom:4px">Your application number is</p>
          <p style="margin:0 0 16px;font-size:20px;font-family:monospace;font-weight:bold">${this.esc(i.applicationId)}</p>
          <p>Keep this number. The admission result will be published in the school notices; there is no portal
          login to use at this stage.</p>
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
