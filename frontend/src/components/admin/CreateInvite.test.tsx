import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateInvite } from './CreateInvite';
import { fakeBackendReply } from '../../test/fakeApi';

// What POST /api/auth/invites answers with 201
const invite = {
  email: 'new.worker@example.com',
  role: 'WORKER',
  inviteCode: 'Xy3_kP9-qR2sT5vW8zA1bC',
  expiresAt: '2026-10-23T12:00:00.000Z',
};

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CreateInvite />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

async function sendInvite(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), invite.email);
  await user.selectOptions(screen.getByLabelText('Role'), 'WORKER');
  await user.click(screen.getByRole('button', { name: 'Create invite' }));
}

describe('CreateInvite (admin)', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'admin-token');
  });

  it("sends the email and role with the admin's token", async () => {
    const requests = fakeBackendReply(201, { success: true, data: invite });
    const user = renderPage();

    await sendInvite(user);
    await screen.findByText(invite.inviteCode);

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('post');
    expect(requests[0].url).toBe('/auth/invites');
    expect(JSON.parse(requests[0].data)).toEqual({ email: invite.email, role: 'WORKER' });
    expect(requests[0].headers.Authorization).toBe('Bearer admin-token');
  });

  it('shows the code and its expiry once, with the hand-over note', async () => {
    fakeBackendReply(201, { success: true, data: invite });
    const user = renderPage();

    await sendInvite(user);

    expect(await screen.findByText(invite.inviteCode)).toBeInTheDocument();
    expect(screen.getByText(/Oct 23, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/shown only once/i)).toBeInTheDocument();
    expect(screen.getByText(/in person/i)).toBeInTheDocument();

    // After "Done" the code is gone; nothing can show it again
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByText(invite.inviteCode)).not.toBeInTheDocument();
  });

  it('copies the code to the clipboard', async () => {
    fakeBackendReply(201, { success: true, data: invite });
    const user = renderPage();

    await sendInvite(user);
    await user.click(await screen.findByRole('button', { name: 'Copy' }));

    expect(await navigator.clipboard.readText()).toBe(invite.inviteCode);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('shows the 409 message when the email already has an account', async () => {
    fakeBackendReply(409, { success: false, message: 'This email already has an account' });
    const user = renderPage();

    await sendInvite(user);

    expect(await screen.findByText('This email already has an account')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument();
  });
});
