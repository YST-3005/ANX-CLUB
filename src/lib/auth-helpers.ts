import { getToken as getLocalToken } from './api';

/**
 * Safely extracts the auth token from user object or localStorage.
 * Prevents "user.getIdToken is not a function" errors.
 */
export async function getAuthToken(user?: any): Promise<string> {
  if (user && typeof user.getIdToken === 'function') {
    try {
      const token = await user.getIdToken();
      if (token) return token;
    } catch (e) {
      console.warn('Error calling user.getIdToken():', e);
    }
  }

  // Fallback to local storage token (valid tokens only)
  if (typeof window !== 'undefined') {
    const localToken = getLocalToken() || localStorage.getItem('anx_token') || localStorage.getItem('session');
    if (localToken && !localToken.startsWith('session_') && !localToken.startsWith('mock_') && !localToken.startsWith('demo-')) {
      return localToken;
    }
  }

  return '';
}
