import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Signup } from './Signup';
import { useAuthStore } from '../store/authStore';
import { fakeBackendReply } from '../test/fakeApi';

// The backend's one answer for every refused sign-up (SIGNUP_REFUSED in auth.service.ts)
const SIGNUP_REFUSED =
  'Sign-up is not available for this email. If you have an account, log in; otherwise ask your property manager.';

const form = {
  email: 'new.worker@example.com',
  inviteCode: 'Xy3_kP9-qR2sT5vW8zA1bC',
  firstName: 'Nia',
  lastName: 'Okafor',
  phone: '+1 555 0100',
  password: 'Strong@Pass1',
};

// What POST /api/auth/signup answers with 201
const created = {
  success: true,
  data: {
    token: 'new-user-jwt',
    user: { id: 'u1', email: form.email, role: 'WORKER', firstName: 'Nia', lastName: 'Okafor' },
  },
};

function renderSignup() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/signup']}>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/admin" element={<p>Admin home</p>} />
          <Route path="/worker" element={<p>Worker home</p>} />
          <Route path="/tenant" element={<p>Tenant home</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, changes: Partial<typeof form> = {}) {
  const values = { ...form, ...changes };
  await user.type(screen.getByLabelText('Email'), values.email);
  await user.type(screen.getByLabelText('Invite code'), values.inviteCode);
  await user.type(screen.getByLabelText('First name'), values.firstName);
  await user.type(screen.getByLabelText('Last name'), values.lastName);
  if (values.phone) await user.type(screen.getByLabelText('Phone (optional)'), values.phone);
  await user.type(screen.getByLabelText('Password'), values.password);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
}

describe('Signup page', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it('sends the form to POST /auth/signup', async () => {
    const requests = fakeBackendReply(201, created);
    const user = renderSignup();

    await fillAndSubmit(user);
    await screen.findByText('Worker home');

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('post');
    expect(requests[0].url).toBe('/auth/signup');
    expect(JSON.parse(requests[0].data)).toEqual(form);
  });

  it('leaves out the phone when it is empty', async () => {
    const requests = fakeBackendReply(201, created);
    const user = renderSignup();

    await fillAndSubmit(user, { phone: '' });
    await screen.findByText('Worker home');

    expect(JSON.parse(requests[0].data)).not.toHaveProperty('phone');
  });

  it("on 201 stores the token like login does and opens the role's home page", async () => {
    fakeBackendReply(201, created);
    const user = renderSignup();

    await fillAndSubmit(user);

    expect(await screen.findByText('Worker home')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBe('new-user-jwt');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.role).toBe('WORKER');
  });

  // The same five rules as strongPassword in backend/src/controllers/auth.controller.ts
  it.each([
    ['Short@1', 'Password must be at least 8 characters'],
    ['nocapital@1', 'Password must contain at least one uppercase letter'],
    ['NOLOWER@1', 'Password must contain at least one lowercase letter'],
    ['NoNumber@x', 'Password must contain at least one number'],
    ['NoSymbol12', 'Password must contain at least one special character'],
    // ^ is a symbol, but not one of the backend's @$!%*?&#
    ['Caret^Pass1', 'Password must contain at least one special character'],
  ])('refuses the password %s before sending anything', async (password, message) => {
    const requests = fakeBackendReply(201, created);
    const user = renderSignup();

    await fillAndSubmit(user, { password });

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(requests).toHaveLength(0);
  });

  it('shows the 403 message exactly as the backend sends it, and logs nobody in', async () => {
    fakeBackendReply(403, { success: false, message: SIGNUP_REFUSED });
    const user = renderSignup();

    await fillAndSubmit(user);

    expect((await screen.findByRole('alert')).textContent).toBe(SIGNUP_REFUSED);
    expect(localStorage.getItem('token')).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('shows a 400 message exactly as the backend sends it', async () => {
    const message = 'body.inviteCode: Invite code is required';
    fakeBackendReply(400, { success: false, message });
    const user = renderSignup();

    await fillAndSubmit(user);

    expect((await screen.findByRole('alert')).textContent).toBe(message);
  });
});
