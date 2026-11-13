import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { strings } from '../../strings';
import { ApiError, tasksApi } from '../../api/client';
import type { EstimateResponse, Priority } from '../../api/types';

export interface EstimationSuggestionBlockProps {
  boardId: number;
  title: string;
  description: string;
  onApply: (estimateHours: number, priority: Priority, rationale: string, suggestionId?: number) => void;
}

export const EstimationSuggestionBlock: React.FC<EstimationSuggestionBlockProps> = ({
  boardId,
  title,
  description,
  onApply,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<EstimateResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSuggest = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isLoading) return;

    setIsErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await tasksApi.estimate({
        boardId,
        title: trimmedTitle,
        description: description.trim() ? description : undefined,
      });
      setSuggestion(response);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details.code === 'ESTIMATION_RATE_LIMITED' || err.status === 429) {
          setErrorMessage(strings.estimation.rateLimited);
        } else if (err.details.detail) {
          setErrorMessage(err.details.detail);
        } else {
          setErrorMessage(strings.errors.genericFailure);
        }
      } else {
        setErrorMessage(strings.errors.genericFailure);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const setIsErrorMessage = (msg: string | null) => {
    setErrorMessage(msg);
  };

  const handleUseSuggestion = () => {
    if (!suggestion) return;
    onApply(suggestion.estimateHours, suggestion.priority, suggestion.rationale, suggestion.suggestionId);
    setSuggestion(null);
  };

  const handleIgnore = () => {
    setSuggestion(null);
  };

  const getPriorityLabel = (priority: Priority) => {
    switch (priority) {
      case 'HIGH':
        return strings.task.priorityHigh;
      case 'MEDIUM':
        return strings.task.priorityMedium;
      case 'LOW':
        return strings.task.priorityLow;
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {errorMessage && (
        <Banner
          message={errorMessage}
          variant="error"
          onDismiss={() => setErrorMessage(null)}
          className="mb-1"
        />
      )}

      {!suggestion ? (
        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSuggest}
            disabled={!title.trim() || isLoading}
          >
            {isLoading ? strings.estimation.suggesting : strings.estimation.suggestEstimate}
          </Button>
        </div>
      ) : (
        <div
          data-testid="estimation-suggestion-result"
          className="border border-rule rounded-sm p-3 bg-surface-raised flex flex-col gap-2"
        >
          <div className="text-[13px] font-medium text-ink">
            {strings.estimation.summaryLine(suggestion.estimateHours, getPriorityLabel(suggestion.priority))}
          </div>

          <div className="text-[12.5px] text-ink-muted">
            {suggestion.rationale}
          </div>

          <div className="text-[12px] text-ink-muted">
            {suggestion.source === 'LLM'
              ? strings.estimation.suggestedByLlm
              : strings.estimation.fallbackRationale}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={handleUseSuggestion}>
              {strings.estimation.useSuggestion}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleIgnore}>
              {strings.estimation.ignore}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
