import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BoardSettingsDialog } from '../features/board/BoardSettingsDialog';
import { boardsApi, setAuthToken } from '../api/client';
import type { Member } from '../api/types';

describe('BoardSettingsDialog member management and expiring invite codes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    setAuthToken('mock-token');
  });

  const mockMembers: Member[] = [
    { id: 1, displayName: 'Priya Nair', role: 'OWNER' },
    { id: 2, displayName: 'Arjun Mehta', role: 'MEMBER' },
  ];

  it('renders members list with owner and member badges', () => {
    render(
      <BoardSettingsDialog
        isOpen={true}
        onClose={vi.fn()}
        board={{
          id: 10,
          name: 'Sprint 12 Board',
          role: 'OWNER',
          inviteCode: 'TESTCODE',
          inviteCodeExpiresAt: new Date(Date.now() + 86400000 * 5).toISOString(),
        }}
        members={mockMembers}
      />,
    );

    expect(screen.getByText('Members (2)')).toBeInTheDocument();
    expect(screen.getByText('Priya Nair')).toBeInTheDocument();
    expect(screen.getByText('Arjun Mehta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Arjun Mehta' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Priya Nair' })).not.toBeInTheDocument();
  });

  it('removes member when owner confirms removal', async () => {
    const user = userEvent.setup();
    const onMemberRemoved = vi.fn();
    vi.spyOn(boardsApi, 'removeMember').mockResolvedValue(undefined);

    render(
      <BoardSettingsDialog
        isOpen={true}
        onClose={vi.fn()}
        board={{
          id: 10,
          name: 'Sprint 12 Board',
          role: 'OWNER',
          inviteCode: 'TESTCODE',
        }}
        members={mockMembers}
        onMemberRemoved={onMemberRemoved}
      />,
    );

    const removeBtn = screen.getByRole('button', { name: 'Remove Arjun Mehta' });
    await user.click(removeBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmBtn).toBeInTheDocument();

    await user.click(confirmBtn);

    expect(boardsApi.removeMember).toHaveBeenCalledWith(10, 2);
    expect(onMemberRemoved).toHaveBeenCalledWith(2);
  });

  it('regenerates invite code when owner confirms', async () => {
    const user = userEvent.setup();
    const onInviteRegenerated = vi.fn();
    const newExpiresAt = new Date(Date.now() + 86400000 * 7).toISOString();
    vi.spyOn(boardsApi, 'regenerateInviteCode').mockResolvedValue({
      inviteCode: 'NEWCOD99',
      inviteCodeExpiresAt: newExpiresAt,
    });

    render(
      <BoardSettingsDialog
        isOpen={true}
        onClose={vi.fn()}
        board={{
          id: 10,
          name: 'Sprint 12 Board',
          role: 'OWNER',
          inviteCode: 'OLDCOD11',
          inviteCodeExpiresAt: new Date().toISOString(),
        }}
        members={mockMembers}
        onInviteRegenerated={onInviteRegenerated}
      />,
    );

    const regenBtn = screen.getByRole('button', { name: 'Regenerate' });
    await user.click(regenBtn);

    expect(screen.getByText('Regenerate invite code?')).toBeInTheDocument();

    const yesBtn = screen.getByRole('button', { name: 'Yes, regenerate code' });
    await user.click(yesBtn);

    expect(boardsApi.regenerateInviteCode).toHaveBeenCalledWith(10);
    expect(onInviteRegenerated).toHaveBeenCalledWith('NEWCOD99', newExpiresAt);
  });

  it('hides remove and regenerate actions for regular members', () => {
    render(
      <BoardSettingsDialog
        isOpen={true}
        onClose={vi.fn()}
        board={{
          id: 10,
          name: 'Sprint 12 Board',
          role: 'MEMBER',
          inviteCode: 'TESTCODE',
        }}
        members={mockMembers}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Remove Arjun Mehta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Regenerate' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave board' })).toBeInTheDocument();
  });
});
