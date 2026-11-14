import { verifyAuthToken } from '@/lib/firebase/admin-auth'

// Mock Firebase Admin modules
jest.mock('@/lib/firebase/admin', () => {
  return {
    adminAuth: {
      verifyIdToken: jest.fn(),
    },
    adminDb: {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(),
        })),
      })),
    },
  }
})

// Mock Turso usersRepository
jest.mock('@/lib/turso/repositories/usersRepository', () => ({
  usersRepository: {
    getById: jest.fn(),
    provisionMember: jest.fn(),
  },
}))

import { adminAuth } from '@/lib/firebase/admin'
import { usersRepository } from '@/lib/turso/repositories/usersRepository'

describe('verifyAuthToken - Turso Authority & Security', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return null if no Authorization header or session cookie is provided', async () => {
    const req = new Request('http://localhost')
    const result = await verifyAuthToken(req)
    expect(result).toBeNull()
  })

  it('should return null if Authorization header does not start with Bearer', async () => {
    const req = new Request('http://localhost', {
      headers: { Authorization: 'Basic token' },
    })
    const result = await verifyAuthToken(req)
    expect(result).toBeNull()
  })

  it('should return null if Firebase token verification fails', async () => {
    const req = new Request('http://localhost', {
      headers: { Authorization: 'Bearer invalid_token' },
    });
    (adminAuth.verifyIdToken as jest.Mock).mockRejectedValueOnce(new Error('Invalid token'));

    const result = await verifyAuthToken(req);
    expect(result).toBeNull();
  })

  it('should strictly resolve authoritative role from Turso, ignoring token claim forging', async () => {
    const req = new Request('http://localhost', {
      headers: { Authorization: 'Bearer valid_token_with_forged_claim' },
    });

    (adminAuth.verifyIdToken as jest.Mock).mockResolvedValueOnce({
      uid: 'user123',
      email: 'attacker@example.com',
      role: 'Admin', // Forged claim in token
    });

    (usersRepository.getById as jest.Mock).mockResolvedValueOnce({
      id: 'user123',
      email: 'attacker@example.com',
      role: 'Member', // Authoritative role from Turso
      membership_type: 'free',
    });

    const result = await verifyAuthToken(req)
    expect(result).toEqual({
      uid: 'user123',
      email: 'attacker@example.com',
      role: 'Member', // Must reflect Turso, NOT forged token claim
    })
    expect(adminAuth.verifyIdToken).toHaveBeenCalledWith('valid_token_with_forged_claim')
    expect(usersRepository.getById).toHaveBeenCalledWith('user123')
  })

  it('should return Admin role when Turso database confirms user is an Admin', async () => {
    const req = new Request('http://localhost', {
      headers: { Authorization: 'Bearer valid_admin_token' },
    });

    (adminAuth.verifyIdToken as jest.Mock).mockResolvedValueOnce({
      uid: 'admin_uid_777',
      email: 'genuine_admin@example.com',
    });

    (usersRepository.getById as jest.Mock).mockResolvedValueOnce({
      id: 'admin_uid_777',
      email: 'genuine_admin@example.com',
      role: 'Admin',
      membership_type: 'premium',
    });

    const result = await verifyAuthToken(req)
    expect(result).toEqual({
      uid: 'admin_uid_777',
      email: 'genuine_admin@example.com',
      role: 'Admin',
    })
  })

  it('should auto-provision new users in Turso as ordinary Member if not yet present', async () => {
    const req = new Request('http://localhost', {
      headers: { Authorization: 'Bearer new_user_token' },
    });

    (adminAuth.verifyIdToken as jest.Mock).mockResolvedValueOnce({
      uid: 'new_uid_999',
      email: 'newbie@example.com',
      name: 'New User',
    });

    (usersRepository.getById as jest.Mock).mockResolvedValueOnce(null);
    (usersRepository.provisionMember as jest.Mock).mockResolvedValueOnce({
      id: 'new_uid_999',
      email: 'newbie@example.com',
      full_name: 'New User',
      role: 'Member',
      membership_type: 'free',
    });

    const result = await verifyAuthToken(req)
    expect(result).toEqual({
      uid: 'new_uid_999',
      email: 'newbie@example.com',
      role: 'Member',
    })
    expect(usersRepository.provisionMember).toHaveBeenCalledWith({
      id: 'new_uid_999',
      email: 'newbie@example.com',
      full_name: 'New User',
    })
  })

  it('should fail closed (return null) if Turso database lookup fails', async () => {
    const req = new Request('http://localhost', {
      headers: { Authorization: 'Bearer valid_token' },
    });

    (adminAuth.verifyIdToken as jest.Mock).mockResolvedValueOnce({
      uid: 'user789',
      email: 'test@example.com',
    });

    (usersRepository.getById as jest.Mock).mockRejectedValueOnce(new Error('Turso connection timeout'));

    const result = await verifyAuthToken(req)
    expect(result).toBeNull();
  })
})
