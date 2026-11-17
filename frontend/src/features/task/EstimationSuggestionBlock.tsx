import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
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
            <span className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-accent" />
              <span>{isLoading ? strings.estimation.suggesting : strings.estimation.suggestEstimate}</span>
            </span>
          </Button>
        </div>
      ) : (
        <div
          data-testid="estimation-suggestion-result"
          className="border border-rule border-l-2 border-l-accent rounded-sm p-3 bg-surface-raised flex flex-col gap-2 transition-all duration-200 animate-in fade-in slide-in-from-top-1"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-ink">
              {strings.estimation.summaryLine(suggestion.estimateHours, getPriorityLabel(suggestion.priority))}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded">
              <Sparkles size={11} />
              {suggestion.source === 'LLM' ? 'Google Gemini' : 'Heuristic model'}
            </span>
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
