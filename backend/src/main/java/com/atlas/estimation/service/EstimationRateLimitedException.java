package com.atlas.estimation.service;

public class EstimationRateLimitedException extends RuntimeException {

    public EstimationRateLimitedException(String message) {
        super(message);
    }
}
