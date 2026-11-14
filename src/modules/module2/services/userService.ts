import { UserProfile } from '@/modules/module2/types/dashboard';
import { getUserByIdOrEmail } from '@/modules/module2/data';
import { usersRepository } from '@/lib/turso/repositories/usersRepository';

export async function getUser(
  userId: string,
  mock = false,
  fail = false
): Promise<UserProfile | Record<string, never>> {
  if (fail) {
    throw new Error('Simulated failure in User Service');
  }

  if (!mock) {
    try {
      const dbUser = await usersRepository.getById(userId);
      if (dbUser) {
        return {
          id: dbUser.id,
          name: dbUser.full_name,
          email: dbUser.email,
          role: dbUser.role,
          college: dbUser.college_name || undefined,
          overallProgress: Math.min(100, Math.round((dbUser.xp_total / 500) * 100)),
          createdAt: new Date(dbUser.created_at).toISOString(),
        } as unknown as UserProfile;
      }
    } catch (err) {
      console.warn('[userService] Turso query fallback to seed:', err);
    }
  }

  // Fallback / Mock data from Data Layer
  const record = getUserByIdOrEmail(userId);
  if (record) {
    return {
      ...record.user,
      overallProgress: record.overallProgress,
      programProgress: record.programProgress,
    };
  }

  return {};
}
