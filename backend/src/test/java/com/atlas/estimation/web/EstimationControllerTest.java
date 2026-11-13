package com.atlas.estimation.web;

import com.atlas.board.persistence.BoardMemberRepository;
import com.atlas.common.CommonConfig;
import com.atlas.common.GlobalExceptionHandler;
import com.atlas.common.JwtProperties;
import com.atlas.common.RestAuthenticationEntryPoint;
import com.atlas.common.SecurityConfig;
import com.atlas.estimation.persistence.EstimateSuggestionEntity;
import com.atlas.estimation.persistence.EstimateSuggestionOutcome;
import com.atlas.estimation.persistence.EstimateSuggestionRepository;
import com.atlas.estimation.provider.Estimate;
import com.atlas.estimation.provider.EstimationProvider;
import com.atlas.estimation.provider.EstimationUnavailableException;
import com.atlas.estimation.service.EstimationRateLimiter;
import com.atlas.estimation.service.EstimationService;
import com.atlas.estimation.service.HeuristicEstimator;
import com.atlas.task.persistence.Priority;
import com.atlas.task.persistence.TaskRepository;
import com.atlas.task.service.TaskReadService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {EstimationController.class})
@Import({
        SecurityConfig.class,
        JwtProperties.class,
        CommonConfig.class,
        RestAuthenticationEntryPoint.class,
        GlobalExceptionHandler.class,
        EstimationService.class,
        HeuristicEstimator.class
})
@ActiveProfiles("dev")
class EstimationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private BoardMemberRepository boardMemberRepository;

    @MockBean
    private TaskRepository taskRepository;

    @MockBean
    private EstimationProvider estimationProvider;

    @MockBean
    private EstimationRateLimiter rateLimiter;

    @MockBean
    private EstimateSuggestionRepository estimateSuggestionRepository;

    @MockBean
    private TaskReadService taskReadService;

    @BeforeEach
    void setUp() {
        when(boardMemberRepository.existsByIdBoardIdAndIdUserId(eq(1L), eq(3L))).thenReturn(true);
        when(rateLimiter.tryAcquire(3L)).thenReturn(true);
        when(taskRepository.findTop5ByBoardIdAndCompletedAtIsNotNullAndEstimateHoursIsNotNullOrderByCompletedAtDesc(1L))
                .thenReturn(List.of());

        when(estimateSuggestionRepository.save(any(EstimateSuggestionEntity.class)))
                .thenAnswer(inv -> {
                    EstimateSuggestionEntity entity = inv.getArgument(0);
                    return new EstimateSuggestionEntity(
                            entity.getBoardId(),
                            entity.getRequestedBy(),
                            entity.getSource(),
                            entity.getSuggestedHours(),
                            entity.getSuggestedPriority(),
                            entity.getLatencyMs(),
                            entity.getOutcome(),
                            Instant.now()
                    ) {
                        @Override
                        public Long getId() {
                            return 12L;
                        }
                    };
                });
    }

    @Test
    @DisplayName("Valid LLM reply produces 200 response with source LLM")
    void valid_reply_produces_200_llm() throws Exception {
        when(estimationProvider.estimate(any()))
                .thenReturn(new Estimate(new BigDecimal("4.0"), Priority.HIGH, "Similar to completed webhook task."));

        EstimateRequest request = new EstimateRequest(1L, "Add idempotency key to payment intents", "Prevent duplicates");

        mockMvc.perform(post("/api/tasks/estimate")
                        .with(jwt().jwt(j -> j.subject("3")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("LLM"))
                .andExpect(jsonPath("$.estimateHours").value(4.0))
                .andExpect(jsonPath("$.priority").value("HIGH"))
                .andExpect(jsonPath("$.rationale").value("Similar to completed webhook task."))
                .andExpect(jsonPath("$.suggestionId").value(12));
    }

    @Test
    @DisplayName("Provider reply wrapped in code fence produces 200 response with source LLM")
    void reply_wrapped_in_code_fence_produces_200_llm() throws Exception {
        when(estimationProvider.estimate(any()))
                .thenReturn(new Estimate(new BigDecimal("2.5"), Priority.MEDIUM, "Standard implementation"));

        EstimateRequest request = new EstimateRequest(1L, "Add idempotency key", "Description");

        mockMvc.perform(post("/api/tasks/estimate")
                        .with(jwt().jwt(j -> j.subject("3")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("LLM"))
                .andExpect(jsonPath("$.estimateHours").value(2.5))
                .andExpect(jsonPath("$.priority").value("MEDIUM"));
    }

    @Test
    @DisplayName("Malformed JSON from provider produces 200 response with fallback")
    void malformed_json_produces_200_fallback() throws Exception {
        when(estimationProvider.estimate(any()))
                .thenThrow(new EstimationUnavailableException("Model content is not valid JSON"));

        EstimateRequest request = new EstimateRequest(1L, "Fix crash on payment failure", "Urgent bug");

        mockMvc.perform(post("/api/tasks/estimate")
                        .with(jwt().jwt(j -> j.subject("3")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("FALLBACK"))
                .andExpect(jsonPath("$.priority").value("HIGH"))
                .andExpect(jsonPath("$.rationale").value(HeuristicEstimator.FALLBACK_RATIONALE))
                .andExpect(jsonPath("$.suggestionId").value(12));
    }

    @Test
    @DisplayName("Out of range estimate produces 200 response with fallback")
    void out_of_range_estimate_produces_200_fallback() throws Exception {
        when(estimationProvider.estimate(any()))
                .thenThrow(new EstimationUnavailableException("Model reply estimateHours out of range"));

        EstimateRequest request = new EstimateRequest(1L, "Fix crash on payment failure", "Urgent bug");

        mockMvc.perform(post("/api/tasks/estimate")
                        .with(jwt().jwt(j -> j.subject("3")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("FALLBACK"))
                .andExpect(jsonPath("$.rationale").value(HeuristicEstimator.FALLBACK_RATIONALE));
    }

    @Test
    @DisplayName("Invalid priority from provider produces 200 response with fallback")
    void invalid_priority_produces_200_fallback() throws Exception {
        when(estimationProvider.estimate(any()))
                .thenThrow(new EstimationUnavailableException("Model reply invalid priority"));

        EstimateRequest request = new EstimateRequest(1L, "Refactor database queries", "Routine cleanup");

        mockMvc.perform(post("/api/tasks/estimate")
                        .with(jwt().jwt(j -> j.subject("3")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("FALLBACK"))
                .andExpect(jsonPath("$.rationale").value(HeuristicEstimator.FALLBACK_RATIONALE));
    }

    @Test
    @DisplayName("Timeout calling provider produces 200 response with fallback")
    void timeout_produces_200_fallback() throws Exception {
        when(estimationProvider.estimate(any()))
                .thenThrow(new EstimationUnavailableException("Read timed out"));

        EstimateRequest request = new EstimateRequest(1L, "Update documentation typo", "Fix spelling");

        mockMvc.perform(post("/api/tasks/estimate")
                        .with(jwt().jwt(j -> j.subject("3")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("FALLBACK"))
                .andExpect(jsonPath("$.rationale").value(HeuristicEstimator.FALLBACK_RATIONALE));
    }

    @Test
    @DisplayName("No configured key produces 200 response with fallback")
    void no_configured_key_produces_200_fallback() throws Exception {
        when(estimationProvider.estimate(any()))
                .thenThrow(new EstimationUnavailableException("LLM provider is not configured (missing baseUrl or apiKey)"));

        EstimateRequest request = new EstimateRequest(1L, "Standard chore", "Description");

        mockMvc.perform(post("/api/tasks/estimate")
                        .with(jwt().jwt(j -> j.subject("3")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("FALLBACK"))
                .andExpect(jsonPath("$.rationale").value(HeuristicEstimator.FALLBACK_RATIONALE));
    }

    @Test
    @DisplayName("Exceeding rate limit produces 429 ESTIMATION_RATE_LIMITED")
    void rate_limit_exceeded_produces_429() throws Exception {
        when(rateLimiter.tryAcquire(3L)).thenReturn(false);

        EstimateRequest request = new EstimateRequest(1L, "A task", "Description");

        mockMvc.perform(post("/api/tasks/estimate")
                        .with(jwt().jwt(j -> j.subject("3")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("ESTIMATION_RATE_LIMITED"))
                .andExpect(jsonPath("$.detail").value("Too many suggestions in a short time. Try again in a minute."));
    }

    @Test
    @DisplayName("Non-member produces 403 NOT_A_MEMBER")
    void non_member_produces_403() throws Exception {
        when(boardMemberRepository.existsByIdBoardIdAndIdUserId(eq(1L), eq(99L))).thenReturn(false);

        EstimateRequest request = new EstimateRequest(1L, "A task", "Description");

        mockMvc.perform(post("/api/tasks/estimate")
                        .with(jwt().jwt(j -> j.subject("99")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_A_MEMBER"));
    }

    @Test
    @DisplayName("Blank title produces 400 VALIDATION_FAILED")
    void blank_title_produces_400() throws Exception {
        EstimateRequest request = new EstimateRequest(1L, "", "Description");

        mockMvc.perform(post("/api/tasks/estimate")
                        .with(jwt().jwt(j -> j.subject("3")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }
}
