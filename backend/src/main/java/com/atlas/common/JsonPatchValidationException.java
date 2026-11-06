package com.atlas.common;

import java.util.List;

public class JsonPatchValidationException extends RuntimeException {

    private final List<FieldErrorDetail> errors;

    public JsonPatchValidationException(List<FieldErrorDetail> errors) {
        super("Validation failed for task patch");
        this.errors = errors;
    }

    public List<FieldErrorDetail> getErrors() {
        return errors;
    }
}
