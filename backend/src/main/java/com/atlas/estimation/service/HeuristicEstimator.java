package com.atlas.estimation.service;

import com.atlas.estimation.provider.Estimate;
import com.atlas.task.persistence.Priority;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;

@Component
public class HeuristicEstimator {

    public static final String FALLBACK_RATIONALE = "Estimated from the length and wording of the task. The model was unavailable.";

    private static final List<String> HIGH_MULTIPLIER_KEYWORDS = List.of(
            "migrate", "migration", "refactor", "integrate", "integration",
            "authentication", "payment", "schema", "concurrency"
    );

    private static final List<String> LOW_MULTIPLIER_KEYWORDS = List.of(
            "typo", "rename", "label", "copy", "wording", "colour", "color"
    );

    private static final List<String> HIGH_PRIORITY_KEYWORDS = List.of(
            "bug", "crash", "outage", "security", "vulnerability", "blocker", "urgent"
    );

    private static final List<String> LOW_PRIORITY_KEYWORDS = List.of(
            "cleanup", "docs", "documentation", "chore", "polish"
    );

    public Estimate estimate(String title, String description) {
        String safeTitle = title != null ? title.trim() : "";
        String safeDesc = description != null ? description.trim() : "";
        String combined = (safeTitle + " " + safeDesc).trim();

        int wordCount = combined.isEmpty() ? 0 : combined.split("\\s+").length;

        double base;
        if (wordCount <= 15) {
            base = 2.0;
        } else if (wordCount <= 60) {
            base = 4.0;
        } else {
            base = 8.0;
        }

        String lower = combined.toLowerCase(Locale.ROOT);

        if (containsAny(lower, HIGH_MULTIPLIER_KEYWORDS)) {
            base *= 1.5;
        }
        if (containsAny(lower, LOW_MULTIPLIER_KEYWORDS)) {
            base *= 0.5;
        }

        if (base < 0.5) {
            base = 0.5;
        } else if (base > 40.0) {
            base = 40.0;
        }

        double rounded = Math.round(base * 2.0) / 2.0;
        BigDecimal estimateHours = BigDecimal.valueOf(rounded).setScale(1, RoundingMode.HALF_UP);

        Priority priority;
        if (containsAny(lower, HIGH_PRIORITY_KEYWORDS)) {
            priority = Priority.HIGH;
        } else if (containsAny(lower, LOW_PRIORITY_KEYWORDS)) {
            priority = Priority.LOW;
        } else {
            priority = Priority.MEDIUM;
        }

        return new Estimate(estimateHours, priority, FALLBACK_RATIONALE);
    }

    private boolean containsAny(String text, List<String> keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                return true;
            }
        }
        return false;
    }
}
