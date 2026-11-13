package com.atlas.estimation.provider;

import com.atlas.task.persistence.Priority;

import java.math.BigDecimal;

public record Estimate(
        BigDecimal estimateHours,
        Priority priority,
        String rationale
) {
}
