package com.atlas.estimation.service;

import com.atlas.estimation.provider.Estimate;
import com.atlas.task.persistence.Priority;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;

class HeuristicEstimatorTest {

    private final HeuristicEstimator estimator = new HeuristicEstimator();

    @Test
    @DisplayName("Empty title and description gives base 2 hours and default medium priority")
    void empty_input_gives_base_two_hours() {
        Estimate result = estimator.estimate("", "");

        assertThat(result.estimateHours()).isEqualByComparingTo(new BigDecimal("2.0"));
        assertThat(result.priority()).isEqualTo(Priority.MEDIUM);
        assertThat(result.rationale()).isEqualTo(HeuristicEstimator.FALLBACK_RATIONALE);
    }

    @ParameterizedTest(name = "word count {0} -> base {1} hours")
    @CsvSource({
            "5, 2.0",
            "15, 2.0",
            "16, 4.0",
            "40, 4.0",
            "60, 4.0",
            "61, 8.0",
            "100, 8.0"
    })
    @DisplayName("Word count brackets determine base estimate hours")
    void word_count_brackets_determine_base_hours(int words, String expectedHours) {
        String text = String.join(" ", Collections.nCopies(words, "word"));
        Estimate result = estimator.estimate(text, null);

        assertThat(result.estimateHours()).isEqualByComparingTo(new BigDecimal(expectedHours));
        assertThat(result.priority()).isEqualTo(Priority.MEDIUM);
    }

    @ParameterizedTest(name = "high multiplier keyword: {0}")
    @CsvSource({
            "migrate",
            "migration",
            "refactor",
            "integrate",
            "integration",
            "authentication",
            "payment",
            "schema",
            "concurrency"
    })
    @DisplayName("High multiplier keywords scale base hours by 1.5x")
    void high_multiplier_keywords_scale_by_one_point_five(String keyword) {
        // 5 words -> base 2.0 * 1.5 = 3.0
        Estimate resultShort = estimator.estimate("Simple task with " + keyword, null);
        assertThat(resultShort.estimateHours()).isEqualByComparingTo(new BigDecimal("3.0"));

        // 20 words -> base 4.0 * 1.5 = 6.0
        String twentyWords = keyword + " " + String.join(" ", Collections.nCopies(19, "task"));
        Estimate resultMedium = estimator.estimate(twentyWords, null);
        assertThat(resultMedium.estimateHours()).isEqualByComparingTo(new BigDecimal("6.0"));

        // 70 words -> base 8.0 * 1.5 = 12.0
        String seventyWords = keyword + " " + String.join(" ", Collections.nCopies(69, "detail"));
        Estimate resultLong = estimator.estimate(seventyWords, null);
        assertThat(resultLong.estimateHours()).isEqualByComparingTo(new BigDecimal("12.0"));
    }

    @ParameterizedTest(name = "low multiplier keyword: {0}")
    @CsvSource({
            "typo",
            "rename",
            "label",
            "copy",
            "wording",
            "colour",
            "color"
    })
    @DisplayName("Low multiplier keywords scale base hours by 0.5x")
    void low_multiplier_keywords_scale_by_half(String keyword) {
        // 5 words -> base 2.0 * 0.5 = 1.0
        Estimate resultShort = estimator.estimate("Fix " + keyword + " in button text", null);
        assertThat(resultShort.estimateHours()).isEqualByComparingTo(new BigDecimal("1.0"));

        // 20 words -> base 4.0 * 0.5 = 2.0
        String twentyWords = keyword + " " + String.join(" ", Collections.nCopies(19, "task"));
        Estimate resultMedium = estimator.estimate(twentyWords, null);
        assertThat(resultMedium.estimateHours()).isEqualByComparingTo(new BigDecimal("2.0"));

        // 70 words -> base 8.0 * 0.5 = 4.0
        String seventyWords = keyword + " " + String.join(" ", Collections.nCopies(69, "detail"));
        Estimate resultLong = estimator.estimate(seventyWords, null);
        assertThat(resultLong.estimateHours()).isEqualByComparingTo(new BigDecimal("4.0"));
    }

    @Test
    @DisplayName("Both high and low multipliers apply sequentially")
    void both_high_and_low_multipliers_apply() {
        // 5 words -> base 2.0 * 1.5 * 0.5 = 1.5
        Estimate result = estimator.estimate("refactor payment label typo", null);
        assertThat(result.estimateHours()).isEqualByComparingTo(new BigDecimal("1.5"));
    }

    @ParameterizedTest(name = "high priority keyword: {0}")
    @CsvSource({
            "bug",
            "crash",
            "outage",
            "security",
            "vulnerability",
            "blocker",
            "urgent"
    })
    @DisplayName("High priority keywords set priority to HIGH")
    void high_priority_keywords(String keyword) {
        Estimate result = estimator.estimate("Investigate " + keyword + " in production", null);
        assertThat(result.priority()).isEqualTo(Priority.HIGH);
    }

    @ParameterizedTest(name = "low priority keyword: {0}")
    @CsvSource({
            "cleanup",
            "docs",
            "documentation",
            "chore",
            "polish"
    })
    @DisplayName("Low priority keywords set priority to LOW")
    void low_priority_keywords(String keyword) {
        Estimate result = estimator.estimate("Routine " + keyword + " for readme", null);
        assertThat(result.priority()).isEqualTo(Priority.LOW);
    }

    @Test
    @DisplayName("High priority keyword takes precedence over low priority keyword")
    void high_priority_takes_precedence_over_low() {
        Estimate result = estimator.estimate("Security docs cleanup bug", null);
        assertThat(result.priority()).isEqualTo(Priority.HIGH);
    }

    @Test
    @DisplayName("Keyword matching is case-insensitive")
    void keyword_matching_is_case_insensitive() {
        Estimate result = estimator.estimate("MIGRATE AUTHENTICATION SCHEMA BUG", null);
        assertThat(result.priority()).isEqualTo(Priority.HIGH);
        assertThat(result.estimateHours()).isEqualByComparingTo(new BigDecimal("3.0"));
    }
}
