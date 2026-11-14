import { NextResponse, NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/auth';
import { mentorsRepository } from '@/lib/turso/repositories/mentorsRepository';
import { signOAuthState } from '@/lib/security/encryption';
import { sendEmail } from '@/lib/resend';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/admin/mentors/[id]/resend-invite
 * Generates a fresh invitation/password-setup link and re-dispatches invitation email.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdmin(request);
    if ('response' in authResult) {
      return authResult.response;
    }

    const mentorId = params.id;
    const mentor = await mentorsRepository.getById(mentorId);
    if (!mentor) {
      return NextResponse.json({ success: false, error: 'Mentor not found' }, { status: 404 });
    }

    const email = mentor.email;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    let inviteLink = '';
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours expiry

    try {
      inviteLink = await adminAuth.generatePasswordResetLink(email, {
        url: `${appUrl}/login?mentor_welcome=true`,
      });
    } catch (linkErr) {
      const token = signOAuthState({ mentorId, email, userId: mentor.user_id || mentorId, action: 'mentor_invite' });
      inviteLink = `${appUrl}/login?invite=${token}&email=${encodeURIComponent(email)}`;
    }

    // Save invitation
    await mentorsRepository.createInvitation({
      mentor_id: mentorId,
      user_id: mentor.user_id || mentorId,
      email,
      invitation_link: inviteLink,
      expires_at: expiresAt,
    });

    // Send email
    await sendEmail({
      to: email,
      subject: 'Reminder: Set up your ANX-CLUB Mentor Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #f59e0b;">ANX-CLUB Mentor Invitation</h2>
          <p>Hello ${mentor.full_name},</p>
          <p>This is a reminder to activate your mentor account on the ANX-CLUB platform.</p>
          <div style="margin: 24px 0;">
            <a href="${inviteLink}" style="background-color: #f59e0b; color: #09090b; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
              Set Password & Activate Account
            </a>
          </div>
          <p style="font-size: 12px; color: #71717a;">This link will expire in 24 hours.</p>
        </div>
      `,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Invitation successfully resent to ${email}`,
      invitationLink: inviteLink,
      expiresAt,
      invitation: {
        mentorId,
        email,
        invitationLink: inviteLink,
        status: 'pending',
        expiresAt,
      },
    });
  } catch (error: any) {
    console.error('[POST /api/v1/admin/mentors/[id]/resend-invite] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to resend invitation' }, { status: 500 });
  }
}
