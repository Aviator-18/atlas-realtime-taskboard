package com.atlas.estimation.provider;

public interface EstimationProvider {

    /** Returns a validated estimate, or throws EstimationUnavailableException. */
    Estimate estimate(EstimationPrompt prompt);
}
