package com.atlas.estimation.web;

import com.atlas.task.persistence.Priority;

import java.math.BigDecimal;

public record EstimateResponse(
        Long suggestionId,
        BigDecimal estimateHours,
        Priority priority,
        String rationale,
        String source,
        Integer latencyMs
) {
}
