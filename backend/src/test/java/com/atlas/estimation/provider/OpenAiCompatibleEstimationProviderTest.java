package com.atlas.estimation.provider;

import com.atlas.task.persistence.Priority;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class OpenAiCompatibleEstimationProviderTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private RestClient.Builder restClientBuilder;
    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        restClientBuilder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(restClientBuilder).build();
    }

    @Test
    @DisplayName("Throws EstimationUnavailableException when API key is empty")
    void throws_when_api_key_empty() {
        OpenAiCompatibleEstimationProvider provider = new OpenAiCompatibleEstimationProvider(
                "https://api.openai.com/v1", "gpt-4o-mini", "", restClientBuilder.build(), objectMapper);

        EstimationPrompt prompt = new EstimationPrompt(
                new EstimationPrompt.TaskInput("Task title", "Task description"),
                List.of()
        );

        assertThatThrownBy(() -> provider.estimate(prompt))
                .isInstanceOf(EstimationUnavailableException.class)
                .hasMessageContaining("LLM provider is not configured");
    }

    @Test
    @DisplayName("Parses valid completion response successfully")
    void parses_valid_response() {
        OpenAiCompatibleEstimationProvider provider = new OpenAiCompatibleEstimationProvider(
                "https://api.openai.com/v1", "gpt-4o-mini", "test-key", restClientBuilder.build(), objectMapper);

        String responseBody = """
                {
                  "choices": [
                    {
                      "message": {
                        "content": "{\\"estimateHours\\": 3.7, \\"priority\\": \\"HIGH\\", \\"rationale\\": \\"Based on payment webhook task\\"}"
                      }
                    }
                  ]
                }
                """;

        mockServer.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer test-key"))
                .andRespond(withSuccess(responseBody, MediaType.APPLICATION_JSON));

        EstimationPrompt prompt = new EstimationPrompt(
                new EstimationPrompt.TaskInput("Fix refund rounding", "Description"),
                List.of()
        );

        Estimate estimate = provider.estimate(prompt);

        // 3.7 rounded to nearest 0.5 is 3.5 or 4.0? 3.7 * 2 = 7.4 -> round is 7 -> 7 / 2 = 3.5
        assertThat(estimate.estimateHours()).isEqualByComparingTo(new BigDecimal("3.5"));
        assertThat(estimate.priority()).isEqualTo(Priority.HIGH);
        assertThat(estimate.rationale()).isEqualTo("Based on payment webhook task");
    }

    @Test
    @DisplayName("Strips code fence from model reply")
    void strips_code_fence() {
        OpenAiCompatibleEstimationProvider provider = new OpenAiCompatibleEstimationProvider(
                "https://api.openai.com/v1", "gpt-4o-mini", "test-key", restClientBuilder.build(), objectMapper);

        String responseBody = """
                {
                  "choices": [
                    {
                      "message": {
                        "content": "```json\\n{\\"estimateHours\\": 4.0, \\"priority\\": \\"MEDIUM\\", \\"rationale\\": \\"Straightforward implementation\\"}\\n```"
                      }
                    }
                  ]
                }
                """;

        mockServer.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andRespond(withSuccess(responseBody, MediaType.APPLICATION_JSON));

        EstimationPrompt prompt = new EstimationPrompt(
                new EstimationPrompt.TaskInput("Task", "Desc"),
                List.of()
        );

        Estimate estimate = provider.estimate(prompt);
        assertThat(estimate.estimateHours()).isEqualByComparingTo(new BigDecimal("4.0"));
        assertThat(estimate.priority()).isEqualTo(Priority.MEDIUM);
    }

    @Test
    @DisplayName("Throws when JSON is malformed")
    void throws_when_json_malformed() {
        OpenAiCompatibleEstimationProvider provider = new OpenAiCompatibleEstimationProvider(
                "https://api.openai.com/v1", "gpt-4o-mini", "test-key", restClientBuilder.build(), objectMapper);

        String responseBody = """
                {
                  "choices": [
                    {
                      "message": {
                        "content": "Not valid JSON at all"
                      }
                    }
                  ]
                }
                """;

        mockServer.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andRespond(withSuccess(responseBody, MediaType.APPLICATION_JSON));

        EstimationPrompt prompt = new EstimationPrompt(new EstimationPrompt.TaskInput("T", "D"), List.of());
        assertThatThrownBy(() -> provider.estimate(prompt))
                .isInstanceOf(EstimationUnavailableException.class);
    }

    @Test
    @DisplayName("Throws when estimate is out of range")
    void throws_when_estimate_out_of_range() {
        OpenAiCompatibleEstimationProvider provider = new OpenAiCompatibleEstimationProvider(
                "https://api.openai.com/v1", "gpt-4o-mini", "test-key", restClientBuilder.build(), objectMapper);

        String responseBody = """
                {
                  "choices": [
                    {
                      "message": {
                        "content": "{\\"estimateHours\\": 50.0, \\"priority\\": \\"HIGH\\", \\"rationale\\": \\"Too long\\"}"
                      }
                    }
                  ]
                }
                """;

        mockServer.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andRespond(withSuccess(responseBody, MediaType.APPLICATION_JSON));

        EstimationPrompt prompt = new EstimationPrompt(new EstimationPrompt.TaskInput("T", "D"), List.of());
        assertThatThrownBy(() -> provider.estimate(prompt))
                .isInstanceOf(EstimationUnavailableException.class)
                .hasMessageContaining("out of range");
    }

    @Test
    @DisplayName("Throws when priority is invalid")
    void throws_when_priority_invalid() {
        OpenAiCompatibleEstimationProvider provider = new OpenAiCompatibleEstimationProvider(
                "https://api.openai.com/v1", "gpt-4o-mini", "test-key", restClientBuilder.build(), objectMapper);

        String responseBody = """
                {
                  "choices": [
                    {
                      "message": {
                        "content": "{\\"estimateHours\\": 2.0, \\"priority\\": \\"CRITICAL\\", \\"rationale\\": \\"Urgent\\"}"
                      }
                    }
                  ]
                }
                """;

        mockServer.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andRespond(withSuccess(responseBody, MediaType.APPLICATION_JSON));

        EstimationPrompt prompt = new EstimationPrompt(new EstimationPrompt.TaskInput("T", "D"), List.of());
        assertThatThrownBy(() -> provider.estimate(prompt))
                .isInstanceOf(EstimationUnavailableException.class)
                .hasMessageContaining("invalid priority");
    }
}
