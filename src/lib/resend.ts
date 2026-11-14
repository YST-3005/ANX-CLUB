/**
 * Virtual Email Dispatch Service
 * Note: Resend email dependency removed per project specifications.
 * All notification dispatches are routed virtually and surfaced via the In-App notification center.
 */
export const sendEmail = async (
  toOrOptions: string | { to: string; subject: string; html: string; attachments?: any[] },
  subjectParam?: string,
  htmlParam?: string,
  attachmentsParam?: any[]
) => {
  let to: string;
  let subject: string;
  let html: string;

  if (typeof toOrOptions === 'object' && toOrOptions !== null) {
    to = toOrOptions.to;
    subject = toOrOptions.subject;
    html = toOrOptions.html;
  } else {
    to = toOrOptions;
    subject = subjectParam || '';
    html = htmlParam || '';
  }

  console.log(`\n📨 [EMAIL DISPATCH] -> To: ${to} | Subject: "${subject}" (Virtual Delivery)`);
  return {
    id: `email_${Date.now()}`,
    to,
    subject,
    status: 'sent',
    virtual: true,
  };
};
