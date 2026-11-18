import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommandPalette } from '../features/board/CommandPalette';
import { BoardColumnView } from '../features/board/BoardColumnView';
import type { BoardColumn } from '../api/types';

describe('CommandPalette component', () => {
  it('renders commands when open and filters by search query', async () => {
    const user = userEvent.setup();
    const onCreateTask = vi.fn();
    const onFilterPriority = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(
      <CommandPalette
        isOpen={false}
        onClose={onClose}
        onCreateTask={onCreateTask}
        onFilterPriority={onFilterPriority}
        onFilterAssignee={vi.fn()}
        onClearFilters={vi.fn()}
        onCopyInviteCode={vi.fn()}
        onNavigateBoards={vi.fn()}
      />,
    );

    expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument();

    rerender(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        onCreateTask={onCreateTask}
        onFilterPriority={onFilterPriority}
        onFilterAssignee={vi.fn()}
        onClearFilters={vi.fn()}
        onCopyInviteCode={vi.fn()}
        onNavigateBoards={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    expect(screen.getByText('Create new task')).toBeInTheDocument();
    expect(screen.getByText('Filter: High priority')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Type a command or search...');
    await user.type(input, 'high');

    expect(screen.getByText('Filter: High priority')).toBeInTheDocument();
    expect(screen.queryByText('Create new task')).not.toBeInTheDocument();
  });

  it('selects command with Enter and triggers onSelect callback', async () => {
    const user = userEvent.setup();
    const onCreateTask = vi.fn();
    const onClose = vi.fn();

    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        onCreateTask={onCreateTask}
        onFilterPriority={vi.fn()}
        onFilterAssignee={vi.fn()}
        onClearFilters={vi.fn()}
        onCopyInviteCode={vi.fn()}
        onNavigateBoards={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('Type a command or search...');
    await user.type(input, '{enter}');

    expect(onClose).toHaveBeenCalled();
    expect(onCreateTask).toHaveBeenCalled();
  });

  it('closes command palette when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        onCreateTask={vi.fn()}
        onFilterPriority={vi.fn()}
        onFilterAssignee={vi.fn()}
        onClearFilters={vi.fn()}
        onCopyInviteCode={vi.fn()}
        onNavigateBoards={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('Type a command or search...');
    await user.type(input, '{escape}');

    expect(onClose).toHaveBeenCalled();
  });
});

describe('BoardColumnView inline quick-add', () => {
  const mockColumn: BoardColumn = {
    id: 1,
    name: 'To do',
    kind: 'TODO',
    position: 1024,
    tasks: [],
  };

  it('expands inline form on trigger and submits task title', async () => {
    const user = userEvent.setup();
    const onQuickCreateTask = vi.fn().mockResolvedValue(undefined);
    const onAddTask = vi.fn();

    render(
      <BoardColumnView
        column={mockColumn}
        members={[]}
        selectedTaskId={null}
        onSelectTask={vi.fn()}
        onAddTask={onAddTask}
        onQuickCreateTask={onQuickCreateTask}
      />,
    );

    const triggerBtn = screen.getByTestId('quick-add-trigger-1');
    expect(triggerBtn).toHaveTextContent('Add task');
    await user.click(triggerBtn);

    const input = screen.getByPlaceholderText('What needs to be done? (Enter to add)');
    expect(input).toBeInTheDocument();

    await user.type(input, 'Implement idempotency headers{enter}');

    expect(onQuickCreateTask).toHaveBeenCalledWith({
      columnId: 1,
      title: 'Implement idempotency headers',
    });
  });

  it('cancels inline quick add when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onQuickCreateTask = vi.fn();

    render(
      <BoardColumnView
        column={mockColumn}
        members={[]}
        selectedTaskId={null}
        onSelectTask={vi.fn()}
        onAddTask={vi.fn()}
        onQuickCreateTask={onQuickCreateTask}
      />,
    );

    await user.click(screen.getByTestId('quick-add-trigger-1'));
    const input = screen.getByPlaceholderText('What needs to be done? (Enter to add)');
    await user.type(input, 'Draft title');

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelBtn);

    expect(screen.queryByPlaceholderText('What needs to be done? (Enter to add)')).not.toBeInTheDocument();
    expect(screen.getByTestId('quick-add-trigger-1')).toBeInTheDocument();
    expect(onQuickCreateTask).not.toHaveBeenCalled();
  });
});
