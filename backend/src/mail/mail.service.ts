import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

function workspaceInvitationHtml(
  inviterName: string,
  workspaceName: string,
  invitationUrl: string,
): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 480px; margin: 0 auto; padding: 24px;">
    <p style="margin-bottom: 16px;">
      <strong>${escapeHtml(inviterName)}</strong> has invited you to join the workspace
      <strong>${escapeHtml(workspaceName)}</strong>.
    </p>
    <p style="margin-bottom: 24px;">
      Click the button below to accept the invitation and get started.
    </p>
    <p style="margin-bottom: 24px;">
      <a href="${escapeHtml(invitationUrl)}"
         style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
        Accept invitation
      </a>
    </p>
    <p style="font-size: 14px; color: #666;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${escapeHtml(invitationUrl)}" style="color: #2563eb; word-break: break-all;">${escapeHtml(invitationUrl)}</a>
    </p>
  </body>
</html>
`.trim();
}

function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return s.replace(/[&<>"']/g, (ch) => map[ch] ?? ch);
}

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ??
      'onboarding@resend.dev';
  }

  async sendWorkspaceInvitation(
    to: string,
    inviterName: string,
    workspaceName: string,
    invitationUrl: string,
  ): Promise<{ id: string } | { error: { message: string; name: string } }> {
    const { data, error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: [to],
      subject: `You're invited to join ${workspaceName}`,
      html: workspaceInvitationHtml(inviterName, workspaceName, invitationUrl),
    });

    if (error) {
      return { error };
    }
    return { id: data!.id };
  }
}
