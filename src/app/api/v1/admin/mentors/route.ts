import { NextResponse, NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/auth';
import { mentorsRepository } from '@/lib/turso/repositories/mentorsRepository';
import { usersRepository } from '@/lib/turso/repositories/usersRepository';
import { signOAuthState } from '@/lib/security/encryption';
import { sendEmail } from '@/lib/resend';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/admin/mentors
 * Retrieves all mentors with user account status and invitation info.
 * Protected: Admins only.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('response' in authResult) {
      return authResult.response;
    }

    const mentors = await mentorsRepository.listAllForAdmin();
    return NextResponse.json({ success: true, mentors, data: mentors, count: mentors.length }, { status: 200 });
  } catch (error: any) {
    console.error('[GET /api/v1/admin/mentors] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch mentors' }, { status: 500 });
  }
}

/**
 * POST /api/v1/admin/mentors
 * Securely provisions a new Mentor:
 * 1. Creates/verifies Firebase Authentication identity.
 * 2. Creates/updates Turso user with role='Mentor'.
 * 3. Creates Turso mentor profile linked via user_id.
 * 4. Generates expiring password-setup / invitation link.
 * 5. Dispatches email invitation.
 * Protected: Admins only.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('response' in authResult) {
      return authResult.response;
    }

    const body = await request.json().catch(() => ({}));
    const rawName = body.fullName || body.name;
    const rawEmail = body.email || body.ownerEmail;
    const rawTitle = body.title || body.role;
    const rawCompany = body.company;
    const rawBio = body.bio || '';
    const rawSkills = body.skills || body.topics;
    const hourlyRate = Number(body.hourlyRate !== undefined ? body.hourlyRate : 0);
    const imageUrl = body.avatarUrl || body.imageUrl || '';
    const isPremiumOnly = body.isPremiumOnly ? 1 : 0;
    const experienceYears = Number(body.experienceYears || 0);

    // 1. Validation
    if (!rawName || typeof rawName !== 'string' || rawName.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Mentor full name is required' }, { status: 400 });
    }
    if (!rawEmail || typeof rawEmail !== 'string' || !rawEmail.includes('@')) {
      return NextResponse.json({ success: false, error: 'A valid mentor email address is required' }, { status: 400 });
    }
    if (!rawTitle || typeof rawTitle !== 'string' || rawTitle.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Mentor title / designation is required' }, { status: 400 });
    }
    if (!rawCompany || typeof rawCompany !== 'string' || rawCompany.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Mentor company is required' }, { status: 400 });
    }

    const cleanName = rawName.trim();
    const cleanEmail = rawEmail.trim().toLowerCase();
    const cleanTitle = rawTitle.trim();
    const cleanCompany = rawCompany.trim();
    const cleanBio = typeof rawBio === 'string' ? rawBio.trim() : '';

    let skillsArray: string[] = [];
    if (Array.isArray(rawSkills)) {
      skillsArray = rawSkills.map((s) => String(s).trim()).filter(Boolean);
    } else if (typeof rawSkills === 'string') {
      skillsArray = rawSkills.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (skillsArray.length === 0) {
      skillsArray = ['Mentorship', 'Software Engineering'];
    }
    const cleanHourlyRate = Math.max(0, hourlyRate);
    const isAvailable = body.isAvailable !== false;

    // 2. Duplicate Check in Turso
    const existingMentor = await mentorsRepository.getByEmail(cleanEmail);
    if (existingMentor && existingMentor.user_id) {
      // Check if user is already an active mentor
      const linkedUser = await usersRepository.getById(existingMentor.user_id);
      if (linkedUser && linkedUser.role === 'Mentor' && existingMentor.is_available) {
        return NextResponse.json(
          { success: false, error: 'A mentor with this email already exists and has an active account.' },
          { status: 409 }
        );
      }
    }

    // 3. Firebase Authentication Account Provisioning (Server-Side)
    let fbUser: any = null;
    let isNewFirebaseUser = false;
    try {
      fbUser = await adminAuth.getUserByEmail(cleanEmail);
    } catch (err: any) {
      if (err?.code !== 'auth/user-not-found' && !err?.message?.includes('not found') && !err?.message?.includes('USER_NOT_FOUND')) {
        console.warn('[admin/mentors] Firebase user lookup warning:', err?.message || err);
      }
    }

    if (!fbUser || !fbUser.uid) {
      // Generate secure random temporary password (never revealed to frontend)
      const tempPassword = randomBytes(24).toString('base64') + '!Aa1';
      fbUser = await adminAuth.createUser({
        email: cleanEmail,
        displayName: cleanName,
        password: tempPassword,
        emailVerified: true,
      });
      isNewFirebaseUser = true;
    }

    const userId = fbUser.uid;

    // 4. Authoritative Turso User Provisioning with Mentor Role
    await usersRepository.upsert({
      id: userId,
      email: cleanEmail,
      full_name: cleanName,
      role: 'Mentor',
      membership_type: 'premium',
    });
    // Ensure role is strictly set to 'Mentor'
    await usersRepository.updateRole(userId, 'Mentor', 'premium');

    // 5. Authoritative Turso Mentor Profile Creation (strictly linked via user_id)
    const mentorId = existingMentor?.id || `mentor_${userId.substring(0, 16)}`;
    const savedMentor = await mentorsRepository.upsert({
      id: mentorId,
      user_id: userId,
      full_name: cleanName,
      email: cleanEmail,
      title: cleanTitle,
      company: cleanCompany,
      bio: cleanBio,
      avatar_url: imageUrl || null,
      hourly_rate: hourlyRate,
      skills_json: JSON.stringify(skillsArray),
      is_available: 1,
      is_premium_only: isPremiumOnly,
      experience_years: experienceYears,
    });

    // Dual-write to Firestore for backward compatibility if available
    try {
      await adminDb.collection('mentors').doc(mentorId).set({
        id: mentorId,
        userId,
        name: cleanName,
        role: cleanTitle,
        company: cleanCompany,
        bio: cleanBio,
        skills: skillsArray,
        imageUrl: imageUrl || '',
        ownerEmail: cleanEmail,
        hourlyRate,
        isAvailable: true,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (fsErr) {
      // Non-fatal if Firestore is unprovisioned
    }

    // 6. Generate Expiring Account-Setup / Password Link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    let inviteLink = '';
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours expiry

    try {
      inviteLink = await adminAuth.generatePasswordResetLink(cleanEmail, {
        url: `${appUrl}/login?mentor_welcome=true`,
      });
    } catch (linkErr) {
      // Safe fallback token for local/test runtimes
      const token = signOAuthState({ mentorId, email: cleanEmail, userId, action: 'mentor_invite' });
      inviteLink = `${appUrl}/login?invite=${token}&email=${encodeURIComponent(cleanEmail)}`;
    }

    // 7. Persist invitation in mentor_invitations table
    await mentorsRepository.createInvitation({
      mentor_id: mentorId,
      user_id: userId,
      email: cleanEmail,
      invitation_link: inviteLink,
      expires_at: expiresAt,
    });

    // 8. Dispatch Virtual / Real Invitation Email
    const emailSubject = 'You are invited as a Mentor at ANX-CLUB!';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #f59e0b;">Welcome to ANX-CLUB, ${cleanName}!</h2>
        <p>You have been officially invited and appointed as an engineering Mentor on the ANX-CLUB platform.</p>
        <p><strong>Designation:</strong> ${cleanTitle} at ${cleanCompany}</p>
        <p>Please click the button below to set up your password and access your Mentor Dashboard:</p>
        <div style="margin: 24px 0;">
          <a href="${inviteLink}" style="background-color: #f59e0b; color: #09090b; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
            Activate Mentor Account
          </a>
        </div>
        <p style="font-size: 12px; color: #71717a;">This secure link is valid for 24 hours. If you have questions, please reach out to the ANX platform administrator.</p>
      </div>
    `;

    await sendEmail({
      to: cleanEmail,
      subject: emailSubject,
      html: emailHtml,
    }).catch((emailErr) => {
      console.warn('[admin/mentors] Email delivery notice:', emailErr);
    });

    const resultData = {
      id: mentorId,
      userId,
      email: cleanEmail,
      fullName: cleanName,
      title: cleanTitle,
      company: cleanCompany,
      invitationLink: inviteLink,
      isNewFirebaseUser,
      hourlyRate: cleanHourlyRate,
      skills: skillsArray,
      bio: cleanBio,
      isAvailable: isAvailable !== false,
      isPremiumOnly: isPremiumOnly === 1,
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Mentor account successfully created and invitation dispatched.',
        ...resultData,
        data: resultData,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/v1/admin/mentors] Fatal error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create mentor' },
      { status: 500 }
    );
  }
}
