import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import toast, { Toaster } from 'react-hot-toast';
import { Login } from './Login';
import { fakeBackendReply } from '../test/fakeApi';
import { watchPageLoads } from '../test/pageLoads';

// The backend's one answer for every failed login (LOGIN_FAILED in backend/src/services/auth.service.ts)
const LOGIN_FAILED = 'Invalid email or password';

function renderLogin() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<p>Sign-up page</p>} />
        </Routes>
      </MemoryRouter>
      <Toaster />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe('Login page', () => {
  beforeEach(() => {
    // jsdom has no matchMedia; react-hot-toast asks it whether to skip animations
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    toast.remove();
  });

  it('links to the sign-up page for people with an invite code', async () => {
    const user = renderLogin();

    await user.click(screen.getByRole('link', { name: 'Create your account' }));

    expect(screen.getByText('Sign-up page')).toBeInTheDocument();
  });

  it('after a wrong password shows the 401 message and does not reload the page', async () => {
    const pageLoads = watchPageLoads();
    const requests = fakeBackendReply(401, { success: false, message: LOGIN_FAILED });
    const user = renderLogin();

    await user.type(screen.getByLabelText('Email'), 'admin@propertyflow.com');
    await user.type(screen.getByLabelText('Password'), 'Wrong@Pass1');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText(LOGIN_FAILED)).toBeInTheDocument();
    expect(requests[0].url).toBe('/auth/login');
    expect(pageLoads).toEqual([]);
  });
});
