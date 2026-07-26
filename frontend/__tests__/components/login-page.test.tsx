import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../../src/app/login/page';
import { useAuthStore } from '../../src/store/auth';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(''),
  }),
}));

jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn(),
}));

jest.mock('../../src/store/auth', () => ({
  useAuthStore: jest.fn(),
}));

describe('LoginPage Component', () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      login: mockLogin,
      isLoading: false,
    });
  });

  it('renders login form inputs correctly', () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText(/your-workspace/i)).toBeInTheDocument();
  });

  it('validates workspace submission and renders error on empty slug', async () => {
    render(<LoginPage />);

    const continueButton = screen.getByRole('button', { name: /continue to workspace/i });
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter a workspace subdomain/i)).toBeInTheDocument();
    });
  });
});
