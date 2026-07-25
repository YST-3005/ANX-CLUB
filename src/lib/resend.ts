import { sendEmail as unifiedSendEmail } from './notifications/email';

export async function sendEmail(
  toOrObj: string | { to: string; subject: string; html: string; text?: string; attachments?: any[] },
  subject?: string,
  html?: string,
  textOrAttachments?: any
) {
  if (typeof toOrObj === 'object' && toOrObj !== null) {
    return unifiedSendEmail(toOrObj);
  } else {
    const options: any = {
      to: toOrObj as string,
      subject: subject || '',
      html: html || '',
    };
    
    if (Array.isArray(textOrAttachments)) {
      options.attachments = textOrAttachments;
    } else if (typeof textOrAttachments === 'string') {
      options.text = textOrAttachments;
    }
    
    return unifiedSendEmail(options);
  }
}
