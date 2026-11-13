import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EstimationSuggestionBlock } from '../features/task/EstimationSuggestionBlock';
import { CreateTaskDialog } from '../features/task/CreateTaskDialog';
import { tasksApi, ApiError } from '../api/client';
import { strings } from '../strings';
import type { BoardColumn, EstimateResponse, Member } from '../api/types';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    tasksApi: {
      ...actual.tasksApi,
      estimate: vi.fn(),
    },
  };
});

describe('Phase 8: Estimation suggestion block', () => {
  const mockOnApply = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders resting state with Suggest estimate disabled when title is blank', () => {
    render(
      <EstimationSuggestionBlock
        boardId={1}
        title=""
        description=""
        onApply={mockOnApply}
      />
    );

    const button = screen.getByRole('button', { name: strings.estimation.suggestEstimate });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('enables Suggest estimate button when title has text', () => {
    render(
      <EstimationSuggestionBlock
        boardId={1}
        title="Add payment retry"
        description=""
        onApply={mockOnApply}
      />
    );

    const button = screen.getByRole('button', { name: strings.estimation.suggestEstimate });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('shows loading state (Suggesting) without spinner overlay during request', async () => {
    let resolvePromise: (val: EstimateResponse) => void = () => {};
    const promise = new Promise<EstimateResponse>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(tasksApi.estimate).mockReturnValue(promise);

    render(
      <EstimationSuggestionBlock
        boardId={1}
        title="Payment webhook idempotency"
        description="Prevent double capture"
        onApply={mockOnApply}
      />
    );

    const suggestButton = screen.getByRole('button', { name: strings.estimation.suggestEstimate });
    fireEvent.click(suggestButton);

    expect(screen.getByRole('button', { name: strings.estimation.suggesting })).toBeDisabled();

    // Resolve the promise
    resolvePromise({
      suggestionId: 10,
      estimateHours: 4.0,
      priority: 'HIGH',
      rationale: 'Similar to webhook retry task.',
      source: 'LLM',
      latencyMs: 850,
    });

    await waitFor(() => {
      expect(screen.getByText('4 h, High priority')).toBeInTheDocument();
    });
  });

  it('renders LLM result state and applies suggestion on click', async () => {
    vi.mocked(tasksApi.estimate).mockResolvedValue({
      suggestionId: 10,
      estimateHours: 4.0,
      priority: 'HIGH',
      rationale: 'Similar to webhook retry task.',
      source: 'LLM',
      latencyMs: 850,
    });

    render(
      <EstimationSuggestionBlock
        boardId={1}
        title="Payment webhook idempotency"
        description="Prevent double capture"
        onApply={mockOnApply}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: strings.estimation.suggestEstimate }));

    await waitFor(() => {
      expect(screen.getByText('4 h, High priority')).toBeInTheDocument();
      expect(screen.getByText('Similar to webhook retry task.')).toBeInTheDocument();
      expect(screen.getByText(strings.estimation.suggestedByLlm)).toBeInTheDocument();
    });

    // Block never applies values by itself
    expect(mockOnApply).not.toHaveBeenCalled();

    // Clicking "Use suggestion" calls onApply
    fireEvent.click(screen.getByRole('button', { name: strings.estimation.useSuggestion }));
    expect(mockOnApply).toHaveBeenCalledWith(4.0, 'HIGH', 'Similar to webhook retry task.', 10);
  });

  it('renders fallback result state when model is unavailable', async () => {
    vi.mocked(tasksApi.estimate).mockResolvedValue({
      suggestionId: 11,
      estimateHours: 2.0,
      priority: 'MEDIUM',
      rationale: 'Estimated from the length and wording of the task. The model was unavailable.',
      source: 'FALLBACK',
      latencyMs: 12,
    });

    render(
      <EstimationSuggestionBlock
        boardId={1}
        title="Simple copy change"
        description=""
        onApply={mockOnApply}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: strings.estimation.suggestEstimate }));

    await waitFor(() => {
      expect(screen.getByText('2 h, Medium priority')).toBeInTheDocument();
      expect(screen.getByText(strings.estimation.fallbackRationale)).toBeInTheDocument();
    });
  });

  it('clears suggestion block when Ignore is clicked', async () => {
    vi.mocked(tasksApi.estimate).mockResolvedValue({
      suggestionId: 10,
      estimateHours: 4.0,
      priority: 'HIGH',
      rationale: 'Based on prior tasks.',
      source: 'LLM',
      latencyMs: 500,
    });

    render(
      <EstimationSuggestionBlock
        boardId={1}
        title="Some task"
        description=""
        onApply={mockOnApply}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: strings.estimation.suggestEstimate }));

    await waitFor(() => {
      expect(screen.getByText('4 h, High priority')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: strings.estimation.ignore }));

    expect(screen.queryByText('4 h, High priority')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: strings.estimation.suggestEstimate })).toBeInTheDocument();
    expect(mockOnApply).not.toHaveBeenCalled();
  });

  it('handles 429 rate limit error state', async () => {
    const error = new ApiError({
      type: 'https://atlas.local/problems/estimation-rate-limited',
      title: 'Estimation rate limit exceeded',
      status: 429,
      detail: 'Too many suggestions in a short time. Try again in a minute.',
      code: 'ESTIMATION_RATE_LIMITED',
    });

    vi.mocked(tasksApi.estimate).mockRejectedValue(error);

    render(
      <EstimationSuggestionBlock
        boardId={1}
        title="Spamming suggestions"
        description=""
        onApply={mockOnApply}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: strings.estimation.suggestEstimate }));

    await waitFor(() => {
      expect(screen.getByText(strings.estimation.rateLimited)).toBeInTheDocument();
    });
  });

  it('integration in CreateTaskDialog: fills fields on Use suggestion and sends rationale on submit', async () => {
    const user = userEvent.setup();
    const mockOnCreate = vi.fn().mockResolvedValue(undefined);
    const mockOnClose = vi.fn();

    const columns: BoardColumn[] = [
      { id: 1, name: 'To do', kind: 'TODO', position: 1024, tasks: [] },
    ];
    const members: Member[] = [];

    vi.mocked(tasksApi.estimate).mockResolvedValue({
      suggestionId: 42,
      estimateHours: 3.5,
      priority: 'HIGH',
      rationale: 'High priority payment work.',
      source: 'LLM',
      latencyMs: 400,
    });

    render(
      <CreateTaskDialog
        isOpen={true}
        boardId={1}
        defaultColumnId={1}
        columns={columns}
        members={members}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );

    // Enter title
    const titleInput = screen.getByLabelText(/Title/i);
    await user.type(titleInput, 'Fix payment gateway bug');

    // Click Suggest estimate
    const suggestBtn = screen.getByRole('button', { name: strings.estimation.suggestEstimate });
    await user.click(suggestBtn);

    // Verify suggestion block appears
    await waitFor(() => {
      expect(screen.getByText('3.5 h, High priority')).toBeInTheDocument();
    });

    // Form fields are untouched before clicking "Use suggestion"
    const estimateInput = screen.getByLabelText(/Estimate/i);
    expect(estimateInput).toHaveValue(null);

    // Click "Use suggestion"
    await user.click(screen.getByRole('button', { name: strings.estimation.useSuggestion }));

    // Form fields are now filled with suggested values
    expect(estimateInput).toHaveValue(3.5);
    const prioritySelect = screen.getByLabelText(/Priority/i);
    expect(prioritySelect).toHaveValue('HIGH');

    // Fields remain editable by user
    await user.clear(estimateInput);
    await user.type(estimateInput, '5.0');
    expect(estimateInput).toHaveValue(5);

    // Submit form
    await user.click(screen.getByRole('button', { name: strings.task.createTask }));

    expect(mockOnCreate).toHaveBeenCalledWith({
      columnId: 1,
      title: 'Fix payment gateway bug',
      description: undefined,
      estimateHours: 5,
      priority: 'HIGH',
      rationale: 'High priority payment work.',
      suggestionId: 42,
    });
  });
});
