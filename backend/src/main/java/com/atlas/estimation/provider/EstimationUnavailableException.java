package com.atlas.estimation.provider;

public class EstimationUnavailableException extends RuntimeException {

    public EstimationUnavailableException(String message) {
        super(message);
    }

    public EstimationUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
