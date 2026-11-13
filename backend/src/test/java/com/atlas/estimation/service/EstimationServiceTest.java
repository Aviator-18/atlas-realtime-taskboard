package com.atlas.estimation.service;

import com.atlas.board.persistence.BoardMemberRepository;
import com.atlas.common.NotAMemberException;
import com.atlas.estimation.persistence.EstimateSuggestionEntity;
import com.atlas.estimation.persistence.EstimateSuggestionOutcome;
import com.atlas.estimation.persistence.EstimateSuggestionRepository;
import com.atlas.estimation.provider.Estimate;
import com.atlas.estimation.provider.EstimationPrompt;
import com.atlas.estimation.provider.EstimationProvider;
import com.atlas.estimation.provider.EstimationUnavailableException;
import com.atlas.estimation.web.EstimateRequest;
import com.atlas.estimation.web.EstimateResponse;
import com.atlas.task.persistence.Priority;
import com.atlas.task.persistence.TaskEntity;
import com.atlas.task.persistence.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EstimationServiceTest {

    private BoardMemberRepository boardMemberRepository;
    private TaskRepository taskRepository;
    private EstimationProvider estimationProvider;
    private HeuristicEstimator heuristicEstimator;
    private EstimationRateLimiter rateLimiter;
    private EstimateSuggestionRepository estimateSuggestionRepository;
    private Clock clock;
    private EstimationService service;

    @BeforeEach
    void setUp() {
        boardMemberRepository = mock(BoardMemberRepository.class);
        taskRepository = mock(TaskRepository.class);
        estimationProvider = mock(EstimationProvider.class);
        heuristicEstimator = new HeuristicEstimator();
        rateLimiter = mock(EstimationRateLimiter.class);
        estimateSuggestionRepository = mock(EstimateSuggestionRepository.class);
        clock = Clock.fixed(Instant.parse("2026-11-13T10:00:00Z"), ZoneId.of("UTC"));

        service = new EstimationService(
                boardMemberRepository,
                taskRepository,
                estimationProvider,
                heuristicEstimator,
                rateLimiter,
                estimateSuggestionRepository,
                clock
        );

        when(boardMemberRepository.existsByIdBoardIdAndIdUserId(eq(1L), eq(10L))).thenReturn(true);
        when(rateLimiter.tryAcquire(10L)).thenReturn(true);

        when(estimateSuggestionRepository.save(any(EstimateSuggestionEntity.class)))
                .thenAnswer(invocation -> {
                    EstimateSuggestionEntity entity = invocation.getArgument(0);
                    // Mock ID assignment as Hibernate would do
                    return new EstimateSuggestionEntity(
                            entity.getBoardId(),
                            entity.getRequestedBy(),
                            entity.getSource(),
                            entity.getSuggestedHours(),
                            entity.getSuggestedPriority(),
                            entity.getLatencyMs(),
                            entity.getOutcome(),
                            entity.getCreatedAt()
                    ) {
                        @Override
                        public Long getId() {
                            return 99L;
                        }
                    };
                });
    }

    @Test
    @DisplayName("Rejects non-members with NotAMemberException")
    void rejects_non_members() {
        when(boardMemberRepository.existsByIdBoardIdAndIdUserId(1L, 999L)).thenReturn(false);

        EstimateRequest request = new EstimateRequest(1L, "Some task", "Desc");
        assertThatThrownBy(() -> service.requestEstimate(999L, request))
                .isInstanceOf(NotAMemberException.class);
    }

    @Test
    @DisplayName("Rejects rate-limited users with EstimationRateLimitedException")
    void rejects_rate_limited_users() {
        when(rateLimiter.tryAcquire(10L)).thenReturn(false);

        EstimateRequest request = new EstimateRequest(1L, "Some task", "Desc");
        assertThatThrownBy(() -> service.requestEstimate(10L, request))
                .isInstanceOf(EstimationRateLimitedException.class);
    }

    @Test
    @DisplayName("Builds prompt from completed tasks and returns LLM suggestion on success")
    void returns_llm_suggestion_on_success() {
        TaskEntity completed1 = new TaskEntity(1L, 3L, "Completed 1", "Desc 1", 1024, null,
                new BigDecimal("4.0"), Priority.HIGH, null, 10L,
                Instant.now(), Instant.now(), Instant.now(), Instant.now());
        when(taskRepository.findTop5ByBoardIdAndCompletedAtIsNotNullAndEstimateHoursIsNotNullOrderByCompletedAtDesc(1L))
                .thenReturn(List.of(completed1));

        when(estimationProvider.estimate(any(EstimationPrompt.class)))
                .thenReturn(new Estimate(new BigDecimal("4.0"), Priority.HIGH, "Matches completed 1"));

        EstimateRequest request = new EstimateRequest(1L, "New task", "New description");
        EstimateResponse response = service.requestEstimate(10L, request);

        assertThat(response.source()).isEqualTo("LLM");
        assertThat(response.estimateHours()).isEqualByComparingTo(new BigDecimal("4.0"));
        assertThat(response.priority()).isEqualTo(Priority.HIGH);
        assertThat(response.rationale()).isEqualTo("Matches completed 1");
        assertThat(response.suggestionId()).isEqualTo(99L);

        ArgumentCaptor<EstimationPrompt> promptCaptor = ArgumentCaptor.forClass(EstimationPrompt.class);
        verify(estimationProvider).estimate(promptCaptor.capture());
        EstimationPrompt prompt = promptCaptor.getValue();
        assertThat(prompt.task().title()).isEqualTo("New task");
        assertThat(prompt.examples()).hasSize(1);
        assertThat(prompt.examples().get(0).title()).isEqualTo("Completed 1");
        assertThat(prompt.examples().get(0).estimateHours()).isEqualByComparingTo(new BigDecimal("4.0"));
    }

    @Test
    @DisplayName("Falls back to heuristic on provider failure and sets source to FALLBACK")
    void falls_back_to_heuristic_on_provider_failure() {
        when(estimationProvider.estimate(any(EstimationPrompt.class)))
                .thenThrow(new EstimationUnavailableException("Provider timed out"));

        EstimateRequest request = new EstimateRequest(1L, "Payment schema migration bug", "Urgent production issue");
        EstimateResponse response = service.requestEstimate(10L, request);

        assertThat(response.source()).isEqualTo("FALLBACK");
        assertThat(response.priority()).isEqualTo(Priority.HIGH);
        assertThat(response.rationale()).isEqualTo(HeuristicEstimator.FALLBACK_RATIONALE);
        assertThat(response.suggestionId()).isEqualTo(99L);
    }
}
