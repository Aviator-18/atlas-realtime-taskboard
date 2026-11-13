package com.atlas.estimation.service;

import com.atlas.board.persistence.BoardMemberRepository;
import com.atlas.common.NotAMemberException;
import com.atlas.estimation.persistence.EstimateSuggestionEntity;
import com.atlas.estimation.persistence.EstimateSuggestionOutcome;
import com.atlas.estimation.persistence.EstimateSuggestionRepository;
import com.atlas.estimation.provider.Estimate;
import com.atlas.estimation.provider.EstimationPrompt;
import com.atlas.estimation.provider.EstimationProvider;
import com.atlas.estimation.web.EstimateRequest;
import com.atlas.estimation.web.EstimateResponse;
import com.atlas.task.persistence.TaskEntity;
import com.atlas.task.persistence.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.List;

@Service
public class EstimationService {

    private static final Logger log = LoggerFactory.getLogger(EstimationService.class);

    private final BoardMemberRepository boardMemberRepository;
    private final TaskRepository taskRepository;
    private final EstimationProvider estimationProvider;
    private final HeuristicEstimator heuristicEstimator;
    private final EstimationRateLimiter rateLimiter;
    private final EstimateSuggestionRepository estimateSuggestionRepository;
    private final Clock clock;

    public EstimationService(BoardMemberRepository boardMemberRepository,
                             TaskRepository taskRepository,
                             EstimationProvider estimationProvider,
                             HeuristicEstimator heuristicEstimator,
                             EstimationRateLimiter rateLimiter,
                             EstimateSuggestionRepository estimateSuggestionRepository,
                             Clock clock) {
        this.boardMemberRepository = boardMemberRepository;
        this.taskRepository = taskRepository;
        this.estimationProvider = estimationProvider;
        this.heuristicEstimator = heuristicEstimator;
        this.rateLimiter = rateLimiter;
        this.estimateSuggestionRepository = estimateSuggestionRepository;
        this.clock = clock;
    }

    public EstimateResponse requestEstimate(Long userId, EstimateRequest request) {
        if (!boardMemberRepository.existsByIdBoardIdAndIdUserId(request.boardId(), userId)) {
            throw new NotAMemberException("User is not a member of board: " + request.boardId());
        }

        if (!rateLimiter.tryAcquire(userId)) {
            throw new EstimationRateLimitedException("Estimation rate limit exceeded for user: " + userId);
        }

        List<TaskEntity> completedTasks = taskRepository
                .findTop5ByBoardIdAndCompletedAtIsNotNullAndEstimateHoursIsNotNullOrderByCompletedAtDesc(request.boardId());

        List<EstimationPrompt.ExampleInput> examples = completedTasks.stream()
                .map(t -> new EstimationPrompt.ExampleInput(t.getTitle(), t.getDescription(), t.getEstimateHours()))
                .toList();

        EstimationPrompt prompt = new EstimationPrompt(
                new EstimationPrompt.TaskInput(request.title(), request.description()),
                examples
        );

        long start = System.currentTimeMillis();
        Estimate estimate;
        String source;

        try {
            estimate = estimationProvider.estimate(prompt);
            source = "LLM";
        } catch (Exception e) {
            log.info("LLM estimation failed ({}), falling back to heuristic", e.getMessage());
            estimate = heuristicEstimator.estimate(request.title(), request.description());
            source = "FALLBACK";
        }

        long end = System.currentTimeMillis();
        int latencyMs = (int) (end - start);

        EstimateSuggestionEntity suggestion = new EstimateSuggestionEntity(
                request.boardId(),
                userId,
                source,
                estimate.estimateHours(),
                estimate.priority().name(),
                latencyMs,
                EstimateSuggestionOutcome.PENDING,
                clock.instant()
        );

        suggestion = estimateSuggestionRepository.save(suggestion);

        return new EstimateResponse(
                suggestion.getId(),
                estimate.estimateHours(),
                estimate.priority(),
                estimate.rationale(),
                source,
                latencyMs
        );
    }
}
