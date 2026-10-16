import { describe, it, expect, afterEach, vi } from 'vitest';
import api from './api';
import { fakeBackendReply } from '../test/fakeApi';
import { watchPageLoads } from '../test/pageLoads';

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // A 401 here means the saved token is no longer accepted (see backend/src/middleware/auth.ts)
  it.each(['/auth/profile', '/tickets'])(
    'on a 401 from GET %s forgets the saved login and opens the login page',
    async (url) => {
      localStorage.setItem('token', 'expired-jwt');
      const pageLoads = watchPageLoads();
      fakeBackendReply(401, { success: false, message: 'Your session has ended. Please log in again.' });

      await expect(api.get(url)).rejects.toMatchObject({ response: { status: 401 } });

      expect(localStorage.getItem('token')).toBeNull();
      expect(pageLoads).toEqual(['/login']);
    },
  );
});
