/**
 * Gmail Service for Google Workspace Integration in "Alô Mãe"
 * Provides methods to send official school attendance notices, list messages,
 * and check Gmail profile using the user's OAuth access token.
 */

import { getCachedGoogleAccessToken } from './auth.service';

export interface SendEmailParams {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  senderName?: string;
}

export interface GmailMessageItem {
  id: string;
  threadId: string;
  snippet?: string;
  subject?: string;
  from?: string;
  date?: string;
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

/**
 * Encodes an RFC 2822 email string to URL-safe base64 format required by Gmail API.
 */
function makeBase64UrlSafe(str: string): string {
  if (typeof window === 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64url');
  }
  // Browser base64url encode
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return window
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Constructs an RFC 2822 email message.
 */
function createMimeMessage({
  to,
  subject,
  bodyHtml,
  bodyText = '',
  senderName = 'Alô Mãe — Notificações Escolares',
}: SendEmailParams): string {
  const boundary = `boundary_${Date.now().toString(16)}`;

  return [
    `From: "${senderName}" <me>`,
    `To: ${to}`,
    `Subject: =?utf-8?B?${typeof window !== 'undefined' ? window.btoa(unescape(encodeURIComponent(subject))) : Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    bodyText || bodyHtml.replace(/<[^>]*>?/gm, ''),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    bodyHtml,
    '',
    `--${boundary}--`,
  ].join('\r\n');
}

/**
 * Sends an email via the Gmail API on behalf of the authenticated user.
 * Prompts user confirmation if requested.
 */
export async function sendEmailViaGmail(
  params: SendEmailParams,
  options?: { requireConfirmation?: boolean }
): Promise<{ success: boolean; id: string; threadId: string }> {
  const accessToken = getCachedGoogleAccessToken();

  if (!accessToken) {
    throw new Error(
      'Não foi encontrado o token de acesso da conta Google. Por favor, inicie sessão com o Google (Gmail).'
    );
  }

  if (options?.requireConfirmation && typeof window !== 'undefined') {
    const confirmed = window.confirm(
      `Deseja enviar o e-mail através do seu Gmail para "${params.to}"?\n\nAssunto: ${params.subject}`
    );
    if (!confirmed) {
      throw new Error('Envio de e-mail cancelado pelo utilizador.');
    }
  }

  const rawMime = createMimeMessage(params);
  const rawBase64 = makeBase64UrlSafe(rawMime);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: rawBase64 }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const message =
      errorJson?.error?.message || `Falha ao enviar e-mail via Gmail (${response.status})`;
    throw new Error(message);
  }

  const result = await response.json();
  return {
    success: true,
    id: result.id,
    threadId: result.threadId,
  };
}

/**
 * Gets the current user's Gmail profile (email, message counts).
 */
export async function getGmailProfile(): Promise<GmailProfile | null> {
  const accessToken = getCachedGoogleAccessToken();
  if (!accessToken) return null;

  try {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Lists the latest messages from the authenticated user's Gmail inbox.
 */
export async function listGmailMessages(
  maxResults = 5,
  q = ''
): Promise<GmailMessageItem[]> {
  const accessToken = getCachedGoogleAccessToken();
  if (!accessToken) return [];

  try {
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.set('maxResults', String(maxResults));
    if (q) url.searchParams.set('q', q);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return [];
    const data = await res.json();
    const messages = data.messages || [];

    // Fetch brief details for each message
    const details = await Promise.all(
      messages.map(async (m: { id: string; threadId: string }) => {
        try {
          const detailRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!detailRes.ok) return { id: m.id, threadId: m.threadId };
          const detailData = await detailRes.json();
          const headers = detailData.payload?.headers || [];
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'Sem Assunto';
          const from = headers.find((h: any) => h.name === 'From')?.value || '';
          const date = headers.find((h: any) => h.name === 'Date')?.value || '';

          return {
            id: m.id,
            threadId: m.threadId,
            snippet: detailData.snippet,
            subject,
            from,
            date,
          };
        } catch {
          return { id: m.id, threadId: m.threadId };
        }
      })
    );

    return details;
  } catch (err) {
    console.warn('Erro ao listar mensagens Gmail:', err);
    return [];
  }
}
