package com.atlas.estimation.provider;

import java.math.BigDecimal;
import java.util.List;

public record EstimationPrompt(
        TaskInput task,
        List<ExampleInput> examples
) {
    public record TaskInput(
            String title,
            String description
    ) {
    }

    public record ExampleInput(
            String title,
            String description,
            BigDecimal estimateHours
    ) {
    }
}
