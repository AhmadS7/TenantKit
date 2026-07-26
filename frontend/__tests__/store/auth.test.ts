import { useAuthStore } from '../../src/store/auth';
import { api } from '../../src/lib/api';

jest.mock('../../src/lib/api', () => ({
  api: {
    post: jest.fn(),
  },
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('initializes authentication state from localStorage', () => {
    const mockUser = { id: 'u-1', email: 'user@example.com' };
    localStorage.setItem('access_token', 'valid-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('handles login success and updates state', async () => {
    const mockUser = { id: 'u-1', email: 'user@example.com' };
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: {
        accessToken: 'access-123',
        refreshToken: 'refresh-123',
        user: mockUser,
      },
    });

    await useAuthStore.getState().login('user@example.com', 'password123');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(localStorage.getItem('access_token')).toBe('access-123');
    expect(localStorage.getItem('refresh_token')).toBe('refresh-123');
  });

  it('handles login failure and sets error message', async () => {
    (api.post as jest.Mock).mockRejectedValueOnce(new Error('Invalid credentials'));

    await expect(
      useAuthStore.getState().login('wrong@example.com', 'wrongpass'),
    ).rejects.toThrow('Login failed');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe('Login failed');
  });

  it('clears session on logout', async () => {
    localStorage.setItem('access_token', 'token-123');
    localStorage.setItem('refresh_token', 'refresh-123');
    (api.post as jest.Mock).mockResolvedValueOnce({});

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorage.getItem('access_token')).toBeNull();
  });
});
