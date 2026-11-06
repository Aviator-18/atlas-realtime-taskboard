package com.atlas.common;

public class NotAMemberException extends RuntimeException {

    public NotAMemberException(String message) {
        super(message);
    }
}
